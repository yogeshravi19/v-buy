"""
V FOODS - Automated Verification Suite for Backend Reliability Features
Tests:
1. Deep Readiness & Liveness Probes (/health/live, /health/ready)
2. In-Memory Sliding-Window Rate Limiting
3. Monotonic Sequenced Outlet Tokens
4. Client-Side Idempotency Header Caching
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))

from main import (
    app,
    check_rate_limit,
    _RATE_LIMIT_STORE,
    _IDEMPOTENCY_CACHE,
    _get_idempotent_response,
    _save_idempotent_response,
    _OUTLET_LOCAL_COUNTERS,
    _get_next_outlet_token
)

class TestBackendReliability(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.client = TestClient(app)
        _RATE_LIMIT_STORE.clear()
        _IDEMPOTENCY_CACHE.clear()
        _OUTLET_LOCAL_COUNTERS.clear()

    @classmethod
    def tearDownClass(cls):
        from main import scheduler
        if scheduler.running:
            scheduler.shutdown(wait=False)

    def test_01_liveness_probe(self):
        resp = self.client.get("/health/live")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")

    def test_02_readiness_probe(self):
        resp = self.client.get("/health/ready")
        self.assertIn(resp.status_code, [200, 503])
        data = resp.json()
        self.assertIn("database", data)

    def test_03_sliding_window_rate_limiter(self):
        client_key = "test_user_ip_1"
        for _ in range(5):
            self.assertTrue(check_rate_limit(client_key, limit=5, window_seconds=60))
        # 6th attempt should be blocked
        self.assertFalse(check_rate_limit(client_key, limit=5, window_seconds=60))

    def test_04_idempotency_cache(self):
        key = "idemp_test_key_abc_123"
        self.assertIsNone(_get_idempotent_response(key))
        
        payload = {"order_id": 999, "token": "105"}
        _save_idempotent_response(key, payload)
        
        cached = _get_idempotent_response(key)
        self.assertEqual(cached, payload)

    async def test_05_monotonic_outlet_tokens(self):
        t1 = await _get_next_outlet_token("main-canteen")
        t2 = await _get_next_outlet_token("main-canteen")
        t3 = await _get_next_outlet_token("bakery-canteen")
        
        self.assertEqual(t1, "101")
        self.assertEqual(t2, "102")
        self.assertEqual(t3, "101")  # Different outlet starts at 101

if __name__ == "__main__":
    unittest.main()
