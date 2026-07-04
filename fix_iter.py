import re
with open('src/App.tsx', 'r') as f:
    text = f.read()

text = re.sub(r"id: ''av-\$\{Date.now\(\)\}`", r"id: `nav-${Date.now()}`", text)
text = re.sub(r"title: ''wNavTitle.trim\(\)", r"title: newNavTitle.trim()", text)
text = re.sub(r"route: strmattedRoute", r"route: formattedRoute", text)
text = re.sub(r"route: ''rmattedRoute", r"route: formattedRoute", text)
text = re.sub(r": ''xt", r": text", text)
text = re.sub(r": ''w", r": new", text)
text = re.sub(r": ''av", r": nav", text)
text = re.sub(r": ''ol", r": tool", text)

with open('src/App.tsx', 'w') as f:
    f.write(text)

with open('src/App.tsx', 'r') as f:
    text = f.read()

text = re.sub(r": ''minNavs", r": adminNavs", text)

with open('src/App.tsx', 'w') as f:
    f.write(text)

with open('src/App.tsx', 'r') as f:
    text = f.read()

text = re.sub(r": ''ev", r": prev", text)
text = re.sub(r": ''ew", r": new", text)
text = re.sub(r": ''id", r": id", text) # if it matched : id

with open('src/App.tsx', 'w') as f:
    f.write(text)
