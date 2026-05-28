#!/usr/bin/env python3
"""Duck Desktop 知识库后端 - 文档解析/分块/存储/检索"""
import json, os, sys, re, hashlib, math
from pathlib import Path
from collections import Counter

KB_DIR = Path(os.environ.get("LOCALAPPDATA", "")) / ".duck-desktop" / "knowledge"
KB_DIR.mkdir(parents=True, exist_ok=True)
INDEX_FILE = KB_DIR / "index.json"

# ═══════════════════════════════════════════
# 索引管理
# ═══════════════════════════════════════════
def load_index():
    if INDEX_FILE.exists():
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    return {"docs": [], "chunks": []}

def save_index(idx):
    INDEX_FILE.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")

# ═══════════════════════════════════════════
# 文档解析
# ═══════════════════════════════════════════
def parse_file(filepath):
    """解析文件，返回纯文本"""
    fp = Path(filepath)
    ext = fp.suffix.lower()
    try:
        if ext in (".txt", ".md", ".py", ".js", ".json", ".yaml", ".yml", ".csv", ".log", ".html", ".css"):
            return fp.read_text(encoding="utf-8", errors="replace")
        elif ext == ".pdf":
            return parse_pdf(fp)
        elif ext in (".docx", ".doc"):
            return parse_docx(fp)
        else:
            return fp.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"[解析错误: {e}]"

def parse_pdf(fp):
    """解析 PDF"""
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(fp))
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except ImportError:
        pass
    try:
        # fallback: pdftotext
        import subprocess
        r = subprocess.run(["pdftotext", str(fp), "-"], capture_output=True, text=True, timeout=30)
        if r.returncode == 0:
            return r.stdout
    except:
        pass
    return "[需要安装 pymupdf: pip install pymupdf]"

def parse_docx(fp):
    """解析 DOCX"""
    try:
        import docx
        doc = docx.Document(str(fp))
        return "\n".join(p.text for p in doc.paragraphs)
    except ImportError:
        return "[需要安装 python-docx: pip install python-docx]"

# ═══════════════════════════════════════════
# 文本分块
# ═══════════════════════════════════════════
def chunk_text(text, chunk_size=500, overlap=50):
    """将文本分成重叠的块"""
    text = re.sub(r'\n{3,}', '\n\n', text.strip())
    if len(text) <= chunk_size:
        return [text] if text else []
    
    chunks = []
    # 先按段落分
    paragraphs = text.split('\n\n')
    current = ""
    for para in paragraphs:
        if len(current) + len(para) > chunk_size and current:
            chunks.append(current.strip())
            # 保留 overlap
            words = current.split()
            overlap_text = " ".join(words[-overlap:]) if len(words) > overlap else ""
            current = overlap_text + "\n\n" + para
        else:
            current = (current + "\n\n" + para).strip()
    if current.strip():
        chunks.append(current.strip())
    
    # 如果块还是太大，按句子切
    final = []
    for chunk in chunks:
        if len(chunk) <= chunk_size * 1.5:
            final.append(chunk)
        else:
            sentences = re.split(r'(?<=[。！？.!?\n])', chunk)
            sub = ""
            for sent in sentences:
                if len(sub) + len(sent) > chunk_size and sub:
                    final.append(sub.strip())
                    sub = sent
                else:
                    sub += sent
            if sub.strip():
                final.append(sub.strip())
    
    return [c for c in final if len(c.strip()) > 10]

# ═══════════════════════════════════════════
# TF-IDF 检索
# ═══════════════════════════════════════════
def tokenize(text):
    """简单分词（中英文混合）"""
    # 英文单词
    en = re.findall(r'[a-zA-Z]+', text.lower())
    # 中文字符（连续2-4字作为词）
    cn_chars = re.findall(r'[\u4e00-\u9fff]+', text)
    cn = []
    for seg in cn_chars:
        for n in (4, 3, 2):
            for i in range(len(seg) - n + 1):
                cn.append(seg[i:i+n])
    return en + cn

def compute_tfidf(chunks, query_tokens):
    """计算查询与每个块的 TF-IDF 相似度"""
    # IDF: 包含 token 的文档数
    n = len(chunks)
    df = Counter()
    chunk_tokens = []
    for chunk in chunks:
        tokens = set(tokenize(chunk))
        chunk_tokens.append(tokens)
        for t in tokens:
            df[t] += 1
    
    # 查询向量
    q_tf = Counter(query_tokens)
    q_len = len(query_tokens) if query_tokens else 1
    
    scores = []
    for i, tokens in enumerate(chunk_tokens):
        score = 0
        for t, qtf in q_tf.items():
            if t in tokens:
                idf = math.log((n + 1) / (df.get(t, 0) + 1)) + 1
                tf = 1  # binary tf for chunk
                score += (qtf / q_len) * tf * idf
        scores.append(score)
    
    return scores

def search(query, top_k=5):
    """检索最相关的块"""
    idx = load_index()
    chunks = idx.get("chunks", [])
    if not chunks:
        return []
    
    query_tokens = tokenize(query)
    if not query_tokens:
        return []
    
    scores = compute_tfidf([c["text"] for c in chunks], query_tokens)
    
    # 排序取 top_k
    ranked = sorted(enumerate(scores), key=lambda x: -x[1])[:top_k]
    
    results = []
    for i, score in ranked:
        if score > 0:
            results.append({
                "text": chunks[i]["text"],
                "source": chunks[i].get("source", ""),
                "score": round(score, 4)
            })
    
    return results

# ═══════════════════════════════════════════
# CLI 命令
# ═══════════════════════════════════════════
def cmd_add(filepath):
    """添加文档到知识库"""
    fp = Path(filepath)
    if not fp.exists():
        return {"ok": False, "error": f"文件不存在: {filepath}"}
    
    text = parse_file(fp)
    if not text or text.startswith("["):
        return {"ok": False, "error": text or "解析为空"}
    
    chunks = chunk_text(text)
    if not chunks:
        return {"ok": False, "error": "分块为空"}
    
    idx = load_index()
    doc_id = hashlib.md5(str(fp).encode()).hexdigest()[:12]
    
    # 移除旧的同文件 chunks
    idx["chunks"] = [c for c in idx["chunks"] if c.get("doc_id") != doc_id]
    
    # 添加新 chunks
    for i, chunk in enumerate(chunks):
        idx["chunks"].append({
            "doc_id": doc_id,
            "source": fp.name,
            "chunk_idx": i,
            "text": chunk
        })
    
    # 更新文档列表
    idx["docs"] = [d for d in idx["docs"] if d.get("id") != doc_id]
    idx["docs"].append({
        "id": doc_id,
        "name": fp.name,
        "path": str(fp),
        "chunks": len(chunks),
        "size": len(text),
        "added": str(Path(filepath).stat().st_mtime)
    })
    
    save_index(idx)
    return {"ok": True, "doc_id": doc_id, "name": fp.name, "chunks": len(chunks)}

def cmd_remove(doc_id):
    """移除文档"""
    idx = load_index()
    idx["docs"] = [d for d in idx["docs"] if d.get("id") != doc_id]
    idx["chunks"] = [c for c in idx["chunks"] if c.get("doc_id") != doc_id]
    save_index(idx)
    return {"ok": True}

def cmd_list():
    """列出所有文档"""
    idx = load_index()
    return {"ok": True, "docs": idx.get("docs", []), "total_chunks": len(idx.get("chunks", []))}

def cmd_search(query, top_k=5):
    """搜索知识库"""
    results = search(query, top_k)
    return {"ok": True, "results": results, "query": query}

def cmd_stats():
    """统计信息"""
    idx = load_index()
    return {
        "ok": True,
        "docs": len(idx.get("docs", [])),
        "chunks": len(idx.get("chunks", [])),
        "index_size": INDEX_FILE.stat().st_size if INDEX_FILE.exists() else 0
    }

# ═══════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "用法: kb.py <command> [args]"}))
        sys.exit(1)
    
    cmd = sys.argv[1]
    try:
        if cmd == "add" and len(sys.argv) > 2:
            result = cmd_add(sys.argv[2])
        elif cmd == "remove" and len(sys.argv) > 2:
            result = cmd_remove(sys.argv[2])
        elif cmd == "list":
            result = cmd_list()
        elif cmd == "search" and len(sys.argv) > 2:
            top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 5
            result = cmd_search(sys.argv[2], top_k)
        elif cmd == "stats":
            result = cmd_stats()
        else:
            result = {"ok": False, "error": f"未知命令: {cmd}"}
    except Exception as e:
        result = {"ok": False, "error": str(e)}
    
    print(json.dumps(result, ensure_ascii=False))
