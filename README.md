# 吉吉修图 (Inpaint_wechat)
吉吉修图是一款快速P图微信小程序（修改自Inpaint_wechat），用来消除图片中指定的人和物，基于微信AI能力，纯客户端实现，无服务端。


本程序借鉴了 MI-GAN 原项目和 inpaint_web 网页实现项目的逻辑以及部分代码，代码开源。

鉴于微信小程序仅支持有限的算子，为了弥补这一限制，本程序采用了 WebAssembly (wasm) 技术，并结合适配微信的 OpenCV 技术，以实现对模型的预处理和后处理。

## 特点： 
- 手机操作，快速去除图片中的杂物，是发朋友圈图片和其他类似需求的好帮手。 
- 去水印，去字幕，去掉闲杂人物。。。 多尝试几次，总会有惊喜等着你。
- 图片数据不上传，100% 确保隐私。

注释：小程序首次执行时，需要下载约30M AI模型到本机。

## Demo（1.选择图片  2.涂抹遮罩  3.消除）

<kbd>
<img src="media/002.jpg" alt="照片修复小助手" width="600"/>
</kbd>

<kbd>
<img src="media/001.jpg" alt="照片修复小助手" width="600"/>
</kbd>

<kbd>
<img src="media/003.jpg" alt="照片修复小助手" width="600"/>
</kbd>

<kbd>
<img src="media/004.jpg" alt="照片修复小助手" width="600"/>
</kbd>

<kbd>
<img src="media/005.jpg" alt="照片修复小助手" width="600"/>
</kbd>

## Video Demo（视频演示）

https://github.com/shifu-group/inpaint_wechat/assets/104042064/06260321-8666-4950-bf9d-116485d5dc0a

## QR Code for the Wechat App （扫描微信小程序二维码打开小程序）
![照片修复小助手](images/mini_code.jpg)

## Operation Tips (操作建议)

1. Multiple inpainting operations can be performed on the target area until satisfactory results are achieved.

可以对目标区域进行连续的多次消除操作，直到对结果满意为止。

2. If you are not satisfied with the current result, you can use "undo" to cancel the operation and then reselect the area. 
Please note that this operation is irreversible.

如果对当前结果不满意，可以用“回退”来取消操作，再重新选择区域。注意此操作不可逆。

## Product Roadmap (版本演进)

- [x] Execution speed optimization. 

     优化执行速度，执行时间缩短2秒以上。

- [x] Manually adjust the mask to zoom in or out. 

     遮罩手动扩大和缩小。
- [x] New UI. 
     
     新的界面。
- [x] Manual download AI model

     手动下载AI模型。
- [x] Enlarge the image and apply a mask to a specific portion of the area. 
     
     放大图像并在指定区域涂抹遮罩。
- [ ] Workflow UI. 
  
     工作流式界面，现有的界面可以看作工作室模式，计划两者共存。
- [ ] Segment anything 
  
     调用AI模型实现目标自动识别。 已完成技术调研，由于微信算子的限制，需要接入后端。暂无开发计划。


## Reference

- The MI-GAN model

https://github.com/Picsart-AI-Research/MI-GAN

- The inpaint-web repository

https://github.com/lxfater/inpaint-web

- Adapted opencv for WeChat

https://github.com/sanyuered/WeChat-MiniProgram-AR-WASM

- Image Cropper

https://github.com/1977474741/image-cropper
