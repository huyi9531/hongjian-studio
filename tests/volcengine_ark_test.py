from backend.generators.volcengine_ark import VolcengineArkGenerator


def test_seedream_request_uses_volcengine_size_field():
    generator = VolcengineArkGenerator({
        "api_key": "test-key",
        "base_url": "https://ark.cn-beijing.volces.com",
        "endpoint_type": "/api/v3/images/generations",
        "model": "doubao-seedream-4-5-251128",
        "image_size": "4K",
    })
    captured = {}

    class FakeClient:
        def generate_via_images(self, payload):
            captured.update(payload)
            return b"image-bytes"

    generator.client = FakeClient()

    assert generator.generate_image("生成一张海报") == b"image-bytes"
    assert captured == {
        "model": "doubao-seedream-4-5-251128",
        "prompt": "生成一张海报",
        "size": "4K",
    }


def test_seedream_pro_falls_back_to_a_supported_size():
    generator = VolcengineArkGenerator({
        "api_key": "test-key",
        "model": "doubao-seedream-5-0-260128",
        "image_size": "4K",
    })
    captured = {}

    class FakeClient:
        def generate_via_images(self, payload):
            captured.update(payload)
            return b"image-bytes"

    generator.client = FakeClient()
    generator.generate_image("生成一张海报")

    assert captured["size"] == "1K"
