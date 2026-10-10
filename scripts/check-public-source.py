"""Check tracked public files without printing matched private content."""
import re, subprocess, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
rules={
 'provider-token':re.compile(r'(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})'),
 'private-key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'personal-home-path':re.compile(r'/(?:Users|home)/[A-Za-z0-9_.-]+/'),
}
fail=[]
for rel in filter(None,files):
 p=root/rel
 if p.is_symlink():fail.append((rel,'symlink'));continue
 if rel.startswith(('memory/','data/','work/','backups/','outputs/')) or pathlib.Path(rel).name.startswith('.env'):
  fail.append((rel,'private-or-runtime-file'))
 try:text=p.read_text()
 except UnicodeDecodeError:continue
 for name,pattern in rules.items():
  if pattern.search(text):fail.append((rel,name))
if fail:
 for rel,rule in fail:print(f'{rel}: {rule}')
 sys.exit(1)
print(f'Public-file privacy guard passed for {len(list(filter(None,files)))} tracked files. Review is still required.')
