# 吉吉修图
吉吉修图是一款快速P图微信小程序（修改自Inpaint_wechat），用来消除图片中指定的人和物，基于微信AI能力，纯客户端实现，无服务端。

202404：原项目Inpaint_wechat目前貌似无法自动下载模型文件，导致暂时无法使用。

本程序借鉴了 MI-GAN 原项目和 inpaint_web 网页实现项目的逻辑以及部分代码，代码开源。

鉴于微信小程序仅支持有限的算子，为了弥补这一限制，本程序采用了 WebAssembly (wasm) 技术，并结合适配微信的 OpenCV 技术，以实现对模型的预处理和后处理。

## 特点： 
- 手机操作，快速去除图片中的杂物，是发朋友圈图片和其他类似需求的好帮手。 
- 去水印，去字幕，去掉闲杂人物。。。 多尝试几次，总会有惊喜等着你。
- 图片数据不上传，100% 确保隐私。

注释：小程序首次执行时，需要手动下载约30M AI模型到本机。

## QR Code for the Wechat App （扫描微信小程序二维码打开小程序）
![照片修复小助手](images/mini_code.jpg)

## Operation Tips (操作建议)

1. Multiple inpainting operations can be performed on the target area until satisfactory results are achieved.

可以对目标区域进行连续的多次消除操作，直到对结果满意为止。

2. If you are not satisfied with the current result, you can use "undo" to cancel the operation and then reselect the area. 
Please note that this operation is irreversible.

如果对当前结果不满意，可以用“回退”来取消操作，再重新选择区域。注意此操作不可逆。

3. 支持从聊天消息中选择图片，然后点击右下角'...'，然后点击“更多打开方式”来打开“吉吉修图”小程序。

## Reference

- Inpaint_wechat

https://github.com/shifu-group/inpaint_wechat

- The MI-GAN model

https://github.com/Picsart-AI-Research/MI-GAN

- The inpaint-web repository

https://github.com/lxfater/inpaint-web

- Adapted opencv for WeChat

https://github.com/sanyuered/WeChat-MiniProgram-AR-WASM

- Image Cropper

https://github.com/1977474741/image-cropper
