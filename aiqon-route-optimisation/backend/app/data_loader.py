"""
Stub data loader module.
Provides a pluggable interface for loading external datasets in future phases.
Currently all data is loaded from local JSON seed files.
"""
from typing import List, Dict, Any


class DataLoader:
    """
    Abstract-style data loader. Override methods in subclasses to
    pull from public datasets (UN/LOCODE, World Port Index, maritime APIs, etc.)
    """

    def load_ports(self) -> List[Dict[str, Any]]:
        """Load port data. Override to use external source."""
        import json, os
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "ports.json")
        with open(os.path.abspath(path), "r", encoding="utf-8") as f:
            return json.load(f)

    def load_shipments(self) -> List[Dict[str, Any]]:
        """Load shipment data. Override to use external source."""
        import json, os
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "shipments_seed.json")
        with open(os.path.abspath(path), "r", encoding="utf-8") as f:
            return json.load(f)


# Default loader used by the application
default_loader = DataLoader()
