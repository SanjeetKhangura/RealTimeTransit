#/usr/bin/env python3
# lazy dev's script to venv and install deps 
# todo: replace this garbage with uv
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -e .
