import json
import os
from typing import List, Dict, Any


class DataLoader:
    def load_ports(self) -> List[Dict[str, Any]]:
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "ports.json")
        with open(os.path.abspath(path), "r", encoding="utf-8") as f:
            return json.load(f)

    def load_shipments(self) -> List[Dict[str, Any]]:
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "shipments_seed.json")
        with open(os.path.abspath(path), "r", encoding="utf-8") as f:
            return json.load(f)


default_loader = DataLoader()
