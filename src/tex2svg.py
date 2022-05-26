#!/usr/bin/env python

import requests
import sys
from pathlib import Path
import json

data = [{"math": math, "format": "TeX", "svg": True} for math in sys.argv[1:]]
print(data)

response = requests.post("http://localhost:3000/", json=data)
for item in response.json():
    print({k:v for k,v in item.items() if k not in ['svg']})
    filename = f"{item['b64digest']}.svg"
    with open(filename, 'w') as f:
        f.write(item['svg'])
        print(filename) 
