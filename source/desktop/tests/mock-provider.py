"""Loopback-only native integration fixture. No keys, no actual AI, no external requests."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
RESULT = {
 "kind":"reaction","status":"needs_conditions","conclusion":"本机联调示例：乙酸与乙醇",
 "answer":"这是本机测试服务返回的固定数据，用来核对桌面网络与绘图流程；没有调用真实AI。",
 "warnings":["固定测试数据，不是对当前输入的真实AI判断。"],
 "steps":[{"reactants":[{"label":"乙酸","smiles":"CC(=O)O"},{"label":"乙醇","smiles":"CCO"}],"products":[{"label":"乙酸乙酯","smiles":"CC(=O)OCC"},{"label":"水","smiles":"O"}],"conditions":"酸催化 · 适当条件","source":"prediction"}]
}
class Handler(BaseHTTPRequestHandler):
 def log_message(self, *args): pass
 def reply(self,data):
  body=json.dumps(data,ensure_ascii=False).encode(); self.send_response(200); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
 def do_GET(self): self.reply({"data":[{"id":"fixture/local-test"}]})
 def do_POST(self):
  request=json.loads(self.rfile.read(int(self.headers.get("Content-Length","0"))))
  assert request["model"]=="fixture/local-test"
  assert request["messages"][0]["role"]=="system"
  print(json.dumps({"native_http_request_received":True,"messages":len(request["messages"]),"contains_image":any(isinstance(m.get("content"),list) and any(i.get("type")=="image_url" for i in m["content"]) for m in request["messages"]),"external_network":False}),flush=True)
  self.reply({"choices":[{"message":{"content":json.dumps(RESULT,ensure_ascii=False)},"finish_reason":"stop"}]})
HTTPServer(("127.0.0.1",39267),Handler).serve_forever()
