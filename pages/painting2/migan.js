global.wasm_url = '/utils/opencv3.4.16.wasm.br'
// opencv_exec.js会从global.wasm_url获取wasm路径
let cv = require('../../utils/opencv_exec.js');

export class Migan {

  // net inference session
  session;
  // is ready
  ready;
  speedTime = 0.0;
  res = 512;
  padding = 128;
  debugMode = true;
  has_migan = false;

  constructor() {
    this.ready = false;
  }

  // 加载模型
  async load(forcedLoad) {
    const modelPath = `${wx.env.USER_DATA_PATH}/migan.onnx`;
    console.log(modelPath);
  
    try {
      if (forcedLoad) {
        await this.forcedLoad();
      } else {
        // 判断之前是否已经下载过onnx模型
        try {
          wx.getFileSystemManager().accessSync(modelPath);
          console.log("File already exists at: " + modelPath);
          const stats = wx.getFileSystemManager().statSync(modelPath);
          console.log("File size: " + stats.size + " bytes");
          this.has_migan = true;
        } catch (error) {
          console.error(error);
          await this.forcedLoad();
        }
      }
    } catch (error) {
      throw error;
    }
    // 创建推断会话
    await this.createInferenceSession(modelPath, forcedLoad);
    console.log("start resolve: ", this.has_migan);
    return this.has_migan;
  }

  forcedLoad() {
    return new Promise((resolve, reject) => {
      const modelPath = `${wx.env.USER_DATA_PATH}/migan.onnx`;
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['onnx', 'ONNX'],
        success: (res) => {
          console.log('res:', res)
          // tempFilePath可以作为img标签的src属性显示图片
          const tempFilePath = res.tempFiles[0].path;
          // 保存模型到本地
          wx.getFileSystemManager().saveFile({
            tempFilePath: tempFilePath,
            filePath: modelPath,
            success: () => { // 文件成功保存后              
              this.has_migan = true;
              console.log("Saved onnx model at path: " + modelPath);
              wx.showToast({
                title: '开始加载模型',
                icon: 'loading',
                duration: 2000
              })
              resolve(); // resolve promise after file check successful
            },
            
            fail: (error) => { // 保存文件失败时
              console.log("Failed to save file: " + modelPath);
              reject(error); // reject the promise if save file failed
            }
          });
        },
        fail: (error) => { // 选择文件失败时
          console.log("Failed to choose file");
          reject(error); // reject the promise if choose file failed
        },
      })
    });
  }

// 创建推断会话
createInferenceSession(modelPath, forcedLoad) {
  return new Promise((resolve, reject) => {
    try {
      this.session = wx.createInferenceSession({
        model: modelPath,
        precisionLevel: 4,
        allowNPU: false,
        allowQuantize: false,
      });

      // 设置错误处理
      this.session.onError((error) => {
        console.error(error);
        wx.showToast({
          title: '模型加载失败',
          icon: 'error',
          duration: 2000
        })
        reject(error);  // 如果发生错误，我们 reject 这个 promise
      });

      // 等待会话加载完成
      this.session.onLoad(() => {
        this.ready = true;
        console.log("load ok");
        if(forcedLoad){
          wx.showToast({
            title: '模型加载成功',
            icon: 'success',
            duration: 2000
          })
        }
        resolve();  // 模型加载成功时，我们 resolve 这个 promise
      });

    } catch (error) {
      // 处理在过程中可能发生的任何错误
      console.error('创建推断会话时出错：');
      reject(error);  // 如果在方法体中发生异常，我们 reject 这个 promise
    }
  });
}


  async downloadFile(url, onCall = () => {}) {
    if (!url) {
      throw new Error('Invalid url');
    }

    return new Promise((resolve, reject) => {
      const downloadTask = wx.downloadFile({
        url: url,
        success: res => {
          if (res.statusCode === 200) {
            if (res.totalBytesExpectedToWrite === res.totalBytesWritten) {
              setTimeout(function () {
                wx.hideLoading()
              }, 200)
              wx.showToast({
                title: '模型下载成功',
                icon: 'success',
                duration: 3000
              })
              resolve(res);
            }

          } else {
            console.error(`Download failed with status code: ${res.statusCode}`);
          }
        },
        fail: err => {},
      });

      downloadTask.onProgressUpdate(res => {
        if (res.totalBytesExpectedToWrite === res.totalBytesWritten) {
          setTimeout(function () {
            wx.hideLoading()
          }, 200)
        } else {
          wx.showLoading({
            title: '下载进度 ' + res.progress,
          })
        }

        if (onCall(res) === false) {
          downloadTask.abort();
          reject(new Error('Download aborted by onCall'));
        }
      });
    });
  }

  async execute(image, mask, src) {
    this.showDebugLog(" - the image is processing");
    wx.showLoading({      
      title: '🍵 正在调用模型修图',
    })
    // 获取裁剪边界框坐标
    const [x_min, x_max, y_min, y_max] = this.getMaskedBbox(mask);

    // 裁剪图像和 mask
    const croppedImg = image.roi(new cv.Rect(x_min, y_min, x_max - x_min, y_max - y_min));
    const croppedMask = mask.roi(new cv.Rect(x_min, y_min, x_max - x_min, y_max - y_min));

    // 预处理
    const modelInput = this.preprocess(croppedImg, croppedMask);
    this.showDebugLog(" - preprocess is completed");

    //*
    // 模型推理
    const modelOutput = await this.runSession(modelInput);
    this.showDebugLog(" - model inference is completed");

    // 后处理
    const postResult = await this.postprocess(croppedImg, croppedMask, modelOutput);
    this.showDebugLog(" - postprocess is completed");
    croppedImg.delete();
    croppedMask.delete();

    // 更新原始图像
    const imageResult = src.clone();
    postResult.copyTo(imageResult.roi(new cv.Rect(x_min, y_min, x_max - x_min, y_max - y_min)));
    postResult.delete();

    this.showDebugLog(" - the converted image is generated");
    setTimeout(function () {
      wx.hideLoading()
    }, 200)

    return imageResult;
    //*/
    /* for test without phone.
    const src_rgba = new cv.Mat();
     cv.cvtColor(image, src_rgba, cv.COLOR_RGB2RGBA);
    return new Uint8ClampedArray(src_rgba.data);
    */
  }

  async runSession(modelInput) {
    const xinput = {
      shape: [1, 4, 512, 512],
      data: modelInput.buffer,
      type: 'float32',
    };

    return new Promise((resolve, reject) => {
      try {
        this.session.run({
          input: xinput
        }).then(res => {
          let output = new Float32Array(res.output.data);
          resolve(output);
        }).catch((err) => {
          console.log(err);
          reject(err);
        });
      } catch (error) {
        wx.showToast({
          title: '运行失败',
          icon: 'error',
          duration: 2000
        });
        setTimeout(function () {
          wx.hideLoading();
        }, 200);
        reject(error);
      }
    });
  }

  getMaskedBbox(mask) {
    // Convert the input mask to a binary image
    const tempMask = new cv.Mat();
    cv.bitwise_not(mask, tempMask);
    const binaryMask = new cv.Mat();
    cv.threshold(tempMask, binaryMask, 254, 255, cv.THRESH_BINARY);

    // Find contours in the binary mask
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(binaryMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Find the bounding box of the contours
    let xMin = Number.MAX_VALUE;
    let xMax = Number.MIN_VALUE;
    let yMin = Number.MAX_VALUE;
    let yMax = Number.MIN_VALUE;

    for (let i = 0; i < contours.size(); ++i) {
      const rect = cv.boundingRect(contours.get(i));
      xMin = Math.min(xMin, rect.x);
      xMax = Math.max(xMax, rect.x + rect.width);
      yMin = Math.min(yMin, rect.y);
      yMax = Math.max(yMax, rect.y + rect.height);
    }

    // Apply padding
    xMin = Math.max(xMin - this.padding, 0);
    xMax = Math.min(xMax + this.padding, mask.cols);
    yMin = Math.max(yMin - this.padding, 0);
    yMax = Math.min(yMax + this.padding, mask.rows);

    // Apply resolution constraint
    const cropSize = Math.max(xMax - xMin, yMax - yMin, this.res);

    // Calculate center and offset
    const cntX = Math.floor((xMin + xMax) / 2);
    const cntY = Math.floor((yMin + yMax) / 2);
    const offset = Math.floor(cropSize / 2);

    // Apply offset constraints
    xMin = Math.max(cntX - offset, 0);
    xMax = Math.min(cntX + offset, mask.cols);
    yMin = Math.max(cntY - offset, 0);
    yMax = Math.min(cntY + offset, mask.rows);

    // Clean up
    tempMask.delete();
    binaryMask.delete();
    contours.delete();
    hierarchy.delete();

    return [xMin, xMax, yMin, yMax];
  }

  preprocess(image, mask) {
    const dsize = new cv.Size(this.res, this.res); // 新尺寸

    // Resize image using BILINEAR interpolation
    const resizedImage = new cv.Mat();
    cv.resize(image, resizedImage, dsize, 0, 0, cv.INTER_LINEAR);

    // Resize mask using NEAREST interpolation
    const resizedMask = new cv.Mat();
    cv.resize(mask, resizedMask, dsize, 0, 0, cv.INTER_NEAREST);

    // Convert image and mask to float32
    const imageChwArray = this.convertImgToChwArray(resizedImage);
    resizedImage.delete();
    const maskChwArray = this.convertMaskToChwArray(resizedMask);
    resizedMask.delete();

    const modelInput = this.mergeImgAndMask(imageChwArray, maskChwArray);

    return modelInput;
  }

  // model_input = torch.cat([mask - 0.5, image * mask], dim=1)
  mergeImgAndMask(img, mask) {
    const temp = new Float32Array(img.length)
    const maskTemp = new Float32Array(mask.length)
    const C = 3
    const H = this.res
    const W = this.res

    for (let c = 0; c < C; c++) {
      for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
          temp[c * H * W + h * W + w] =
            img[c * H * W + h * W + w] * mask[h * W + w]
        }
      }
    }

    for (let h = 0; h < H; h++) {
      for (let w = 0; w < W; w++) {
        maskTemp[h * W + w] = mask[h * W + w] - 0.5
      }
    }
    //链接两个字节数组
    const res = new Float32Array(mask.length + img.length)
    const maskLength = mask.length
    for (let c = 0; c < maskLength; c++) {
      res[c] = maskTemp[c]
    }

    const imgLength = img.length
    for (let c = 0; c < imgLength; c++) {
      res[maskLength + c] = temp[c]
    }

    return res

  }

  convertImgToChwArray(imgData) {
    const channels = new cv.MatVector();
    cv.split(imgData, channels); // 分割通道

    const C = channels.size(); // 通道数
    const H = imgData.rows; // 图像高度
    const W = imgData.cols; // 图像宽度

    const chwArray = new Float32Array(C * H * W); // 创建新的数组来存储转换后的数据

    for (let c = 0; c < C; c++) {
      const channelData = channels.get(c).data;
      for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
          chwArray[c * H * W + h * W + w] = (channelData[h * W + w] * 2) / 255 - 1;
        }
      }
    };
    return chwArray;
  }

  convertMaskToChwArray(imgData) {
    const channels = new cv.MatVector();
    cv.split(imgData, channels); // 分割通道

    const C = 1; // 通道数
    const H = imgData.rows; // 图像高度
    const W = imgData.cols; // 图像宽度

    const chwArray = new Float32Array(C * H * W); // 创建新的数组来存储转换后的数据

    for (let c = 0; c < C; c++) {
      const channelData = channels.get(c).data; // 获取单个通道的数据
      for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
          chwArray[c * H * W + h * W + w] = channelData[h * W + w] / 255;
        }
      }
    };
    return chwArray;
  }

  async postprocess(image, mask, modelOutput) {

    // deal with the modelOutput data and convert it into a CV_8UC3 Mat.
    const chwToHwcData = this.convertToHwcData(modelOutput);
    this.showDebugLog(" - postprogess: convertToHwcData is completed");

    const rgba = new Uint8ClampedArray(chwToHwcData);
    const outImgMat = cv.matFromArray(this.res, this.res, cv.CV_8UC4, rgba);

    // Resize model output using BILINEAR interpolation
    const dsize = new cv.Size(image.cols, image.rows);
    cv.resize(outImgMat, outImgMat, dsize, 0, 0, cv.INTER_LINEAR);
    //await this.tempSaveImageFile(outImgMat);

    // deal with the mask data: apply max pooling
    const maskTemp = this.maxPool2D(mask);
    this.showDebugLog(" - postprogess: maxPool is completed");

    // deal with the mask data: apply Gaussian blur to the mask
    const maskBlur = this.gaussianSmoothing(maskTemp);
    this.showDebugLog(" - postprogess: gaussianSmoothing is completed");
    maskTemp.delete();

    // Compose the final image
    const composedImg = this.createComposedImage(image, maskBlur, outImgMat);
    maskBlur.delete();
    outImgMat.delete();
    this.showDebugLog(" - postprogess: createComposedImage is completed");

    return composedImg;
  }

  createComposedImage(image, mask, modelOutput) {
    const imageRgba = new cv.Mat();
    cv.cvtColor(image, imageRgba, cv.COLOR_RGB2RGBA);

   /*
    const outputArray = new Uint8ClampedArray(modelOutput.data);
    const maskDataLength = mask.data.length;
    for (let i = 0; i < maskDataLength; i++) {
      if (mask.data[i] !==255 && mask.data[i] !==0) {
        const realMark = mask.data[i]/255;
        const realIndex = 4 * i;
        outputArray[realIndex] = imageRgba.data[realIndex] * realMark + modelOutput.data[realIndex] * (1 - realMark);
        outputArray[realIndex + 1] = imageRgba.data[realIndex + 1] * realMark + modelOutput.data[realIndex + 1] * (1 - realMark);
        outputArray[realIndex + 2] = imageRgba.data[realIndex + 2] * realMark + modelOutput.data[realIndex + 2] * (1 - realMark);
      }
    };
    const newOutput = cv.matFromArray(modelOutput.rows, modelOutput.cols, cv.CV_8UC4, outputArray);
    */
    cv.bitwise_not(mask, mask);
    modelOutput.copyTo(imageRgba, mask);
    //newOutput.copyTo(imageRgba, mask);
    //newOutput.delete();

    return imageRgba;
  }

  convertToHwcData(modelOutput) {
    const chwToHwcData = [];
    const width = this.res;
    const height = this.res;
    const size = width * height;
    const channels = 3;

    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        for (let c = 0; c < channels; c++) {
          // RGB通道
          const chwIndex = c * size + h * width + w;
          const pixelVal = modelOutput[chwIndex] * 0.5 + 0.5;
          let newPiex = pixelVal;
          if (pixelVal > 1) {
            newPiex = 1;
          } else if (pixelVal < 0) {
            newPiex = 0;
          }
          chwToHwcData.push(newPiex * 255); // 归一化反转
        }
        chwToHwcData.push(255) // Alpha通道
      }
    };
    return chwToHwcData;
  }

  maxPool2D(src) {
    let kernel = new cv.Mat.ones(5, 5, cv.CV_8U);
    // 膨胀操作
    let dst = new cv.Mat();
    cv.dilate(src, dst, kernel, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    return dst;
  }

  minPool2D(src) {
    let kernel = new cv.Mat.ones(5, 5, cv.CV_8U);
    // 膨胀操作
    let dst = new cv.Mat();
    cv.erode(src, dst, kernel, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    return dst;
  }

  gaussianSmoothing(inputMat) {
    let channels = 1; // 设置为图像的通道数
    const kernelSize = 5; // 设置卷积核的大小
    const sigma = 1.5; // 设置高斯函数的标准差
    const dim = 2; // 设置卷积核的维度

    // 确保 channels 不超过输入图像的通道数
    channels = 1;
    // 创建输出矩阵
    const outputMat = new cv.Mat();
    // 执行 Gaussian Smoothing
    cv.GaussianBlur(inputMat, outputMat, new cv.Size(kernelSize, kernelSize), sigma, sigma, cv.BORDER_DEFAULT);

    return outputMat;
  }

  isReady() {
    return this.ready;
  }

  getTime() {
    return this.speedTime;
  }

  dispose() {
    this.session.destroy();
  }

  showDebugLog(logMessage) {
    if (this.debugMode) {
      const currentTime = new Date();
      const formattedTime = currentTime.toISOString().slice(0, 23).replace("T", " "); // 获取时间戳字符串，格式为YYYY-MM-DD HH:mm:ss
      console.log(formattedTime + logMessage);
    }
  }

  async tempSaveImageFile(image) {
    const base64Img = this.imageDataToDataURL(image);
    const number = Math.random();
    wx.getFileSystemManager().writeFile({
      filePath: wx.env.USER_DATA_PATH + '/pic_inpaint' + number + '.jpg',
      data: base64Img.replace(/^data:image\/\w+;base64,/, ""),
      encoding: 'base64',
      success: async (res) => {
        try {
          await wx.saveImageToPhotosAlbum({
            filePath: wx.env.USER_DATA_PATH + '/pic_inpaint' + number + '.jpg',
            success(res) {
              wx.showToast({
                title: '分享图已成功保存到相册',
                icon: 'none'
              });
            },
            fail(res) {
              wx.showToast({
                title: '生成分享图失败，请重试',
                icon: 'none'
              });
            }
          });
        } catch (error) {
          wx.showToast({
            title: '请授权保存图片权限以保存分享图',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.log(err);
      }
    });
  }

  imageDataToDataURL(input) {
    const offscreenCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: input.cols,
      height: input.rows
    });
    cv.imshow(offscreenCanvas, input);
    return offscreenCanvas.toDataURL(('image/jpg', 0.9));
  }

}