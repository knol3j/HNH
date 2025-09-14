#!/usr/bin/env python3
"""
HashNHedge Dynamic Mining Controller
Handles both cryptocurrency mining and security/pentesting tasks
Revenue sharing: 70% to node operators
"""

import json
import hashlib
import time
import subprocess
import platform
import requests
from datetime import datetime
import os

class HashNHedgeController:
    def __init__(self):
        self.config = self.load_config()
        self.current_task = None
        self.hash_rate = 0
        self.earnings_today = 0
        self.mode = "mining"  # or "security"
        
    def load_config(self):
        """Load node configuration"""
        config_path = os.path.expanduser("~/.hashnhedge/config.json")
        default_config = {
            "node_id": f"NODE-{os.getpid()}",
            "pool_url": "pool.hashnhedge.com:3333",
            "wallet": "",
            "revenue_share": 0.70,
            "auto_switch_threshold": 500,  # Switch to security tasks if pay > $500
            "algorithms": {
                "mining": ["sha256", "ethash", "kawpow", "scrypt"],
                "security": ["md5", "ntlm", "wpa2", "sha1"]
            }
        }
        
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except:
            return default_config

    def check_available_tasks(self):
        """Check server for available high-value tasks"""
        try:
            response = requests.get(
                f"https://api.hashnhedge.com/tasks",
                params={"node_id": self.config["node_id"]}
            )
            tasks = response.json()
            
            # Find highest paying task
            for task in tasks:
                if task["reward"] > self.config["auto_switch_threshold"]:
                    return task
            return None
        except:
            return None
    
    def switch_to_security_mode(self, task):
        """Switch from mining to security/pentesting task"""
        print(f"[SWITCH] High-value task detected: ${task['reward']}")
        self.mode = "security"
        self.current_task = task
        
        if task["type"] == "hashcat":
            self.run_hashcat_task(task)
        elif task["type"] == "bruteforce":
            self.run_bruteforce_task(task)
    
    def run_hashcat_task(self, task):
        """Execute hashcat job"""
        cmd = [
            "hashcat",
            "-m", str(task["hash_type"]),  # Hash type
            "-a", str(task["attack_mode"]), # Attack mode
            task["hash_file"],
            task["wordlist"],
            "--potfile-disable",
            "-o", f"results_{task['id']}.txt"
        ]
        
        if platform.system() == "Windows":
            cmd[0] = "hashcat.exe"
        
        print(f"[HASHCAT] Starting attack on {task['hash_count']} hashes")
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        
        # Monitor progress
        while process.poll() is None:
            time.sleep(10)
            self.report_progress(task["id"], "running")
        
        # Submit results
        self.submit_results(task["id"], f"results_{task['id']}.txt")
