"""火山引擎方舟 Seedream 图片生成器。"""
import base64
import logging
from typing import Any, Dict, List, Optional

from .base import ImageGeneratorBase
from .image_api_client import ImageApiClient
from .image_provider_policy import ImageProviderPolicy
from ..utils.image_compressor import compress_image

logger = logging.getLogger(__name__)


class VolcengineArkGenerator(ImageGeneratorBase):
    """调用火山引擎方舟的 ``/api/v3/images/generations`` 接口。"""

    PRO_MODEL = "doubao-seedream-5-0-260128"
    MODEL_SIZES = {
        "doubao-seedream-4-5-251128": ("2K", "4K"),
        PRO_MODEL: ("1K", "2K"),
    }

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.policy = ImageProviderPolicy.from_config(
            config,
            default_model="doubao-seedream-4-5-251128",
            default_endpoint="/api/v3/images/generations",
        )
        self.client = ImageApiClient(self.policy)
        self.model = self.policy.model
        self.image_size = config.get("image_size", "2K")

    def validate_config(self) -> bool:
        if not self.api_key:
            raise ValueError("火山引擎 API Key 未配置，请在系统设置中填写后保存")
        return True

    def get_supported_sizes(self) -> List[str]:
        return list(self.MODEL_SIZES.get(self.model, ("2K",)))

    def generate_image(
        self,
        prompt: str,
        model: Optional[str] = None,
        reference_images: Optional[List[bytes]] = None,
        **_: Any,
    ) -> bytes:
        self.validate_config()
        model = model or self.model
        supported_sizes = self.MODEL_SIZES.get(model)
        if not supported_sizes:
            raise ValueError(f"不支持的火山引擎 Seedream 模型: {model}")

        size = self.image_size if self.image_size in supported_sizes else supported_sizes[0]
        payload: Dict[str, Any] = {"model": model, "prompt": prompt, "size": size}
        images = self._encode_reference_images(reference_images or [], model)
        if images:
            payload["image"] = images

        logger.info("火山引擎图片生成: model=%s, size=%s, references=%d", model, size, len(images))
        return self.client.generate_via_images(payload)

    @staticmethod
    def _encode_reference_images(images: List[bytes], model: str) -> List[str]:
        max_images = 10 if model == VolcengineArkGenerator.PRO_MODEL else 14
        selected_images = images[:max_images]
        if len(images) > max_images:
            logger.warning("火山引擎 %s 最多支持 %d 张参考图，已忽略多余图片", model, max_images)

        encoded_images = []
        for image in selected_images:
            compressed = compress_image(image, max_size_kb=200)
            encoded = base64.b64encode(compressed).decode("ascii")
            encoded_images.append(f"data:image/png;base64,{encoded}")
        return encoded_images
