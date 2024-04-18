// painting-2.js
global.wasm_url = '/utils/opencv3.4.16.wasm.br'
// opencv_exec.js会从global.wasm_url获取wasm路径
import {
  Migan
} from './migan.js';
import * as imageProcessor from './imageProcessor';

let penType = 'drawPen';
Page({
  /**
   * 页面的初始数据
   */
  data: {
    scale: 1,
    imageList: [],
    showBars: false,
    selectSize: wx.getStorageSync('selectSize') || 20,
    selectColor: wx.getStorageSync('selectColor') || '#ff0000',
    colors: ["#ff0000", "#ffff00", "#00CC00"],
    canvasWidth: 0,
    canvasHeight: 0,
    windowHeight: 0,
    dpr: 1,
    migan: null,
    has_migan: true,
    hasChoosedImg: false,
    hasMask: false,
    isCropped: false,
    _isCropChanged: false,
    croppedImageData: {
      startX: 0,
      startY: 0,
      scale: 1
    },
    imgByOpen: false,
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.unlinkAll();
    let that = this;
    
    const fs = wx.getFileSystemManager()
    // 判断文件/目录是否存在
    fs.access({
      path: `${wx.env.USER_DATA_PATH}/migan.onnx`,
      success(res) {
        // 文件存在 
        that.setData({
          has_migan: true
        });
        console.log(res) 
        that.loadModel()
      },
      fail(res) {
        // 文件不存在或其他错误
        that.setData({
          has_migan: false
        });
        console.log('模型文件不存在，请点击按钮加载。')
      }
    })

    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          canvasWidth: res.windowWidth,
          windowWidth: res.windowWidth,
          canvasHeight: res.windowHeight - 120,
          windowHeight: res.windowHeight
        })
      },
    });
    const dpr = wx.getWindowInfo().pixelRatio
    this.setData({
      dpr: dpr,
      previousCover: null,
      hasPreviousCover: false
    });


  },

  loadModel() {
    let that = this;
    let ishas_migan = false
    const migan = new Migan();
    var has_migan = this.data.has_migan
    migan.load(!has_migan).then((resolvedhas_migan) => {
      ishas_migan = resolvedhas_migan
      console.log('has_migan：', ishas_migan);
      that.setData({
        migan: migan,
        has_migan: ishas_migan
      });
    }).catch(err => {
      console.log('模型加载报错：', err);
    });   
  },

  copyLink() {
    wx.setClipboardData({
      data: 'https://hf-mirror.com/lxfater/inpaint-web/resolve/main/migan.onnx',
      success(res) {
        wx.showToast({
          title: '链接已复制',
          icon: 'none',
          duration: 2000,
        });
      },
      fail(res) {
        console.error('复制链接失败', res);
      }
    });
  },

  // 页面卸载 把字号选择的颜色和透明度保存
  onUnload() {
    const This = this.data;
    penType = 'drawPen';
    wx.setStorageSync('selectSize', This.selectSize);
    wx.setStorageSync('selectColor', This.selectColor);

    if (This.migan && This.migan.isReady()) {
      This.migan.dispose();
    };
    this.unlinkAll();
  },
  unlinkAll: function (options) {
    const basePath = `${wx.env.USER_DATA_PATH}`;
    wx.getFileSystemManager().readdir({
      dirPath: basePath, /// 获取文件列表
      success(res) {
        console.log(res)
        res.files.forEach((val) => { // 遍历文件列表里的数据
          console.log(val)
          if (val.startsWith("pic_inpaint")) {
            wx.getFileSystemManager().unlink({
              filePath: basePath + '/' + val
            })
          }
        })
      }
    });
  },

  unlink(filePath) {
    wx.getFileSystemManager().unlink({
      filePath: filePath
    });
  },

  clearCroppedImage() {
    this.setData({
      isCropped: false
    });
    this.unlink(this.data.croppedCover);
  },

  async onShow() {
    const that = this;
    var tmpPicPath = getApp().globalData.tmpPicPath
    console.log('tmpPicPath: ', tmpPicPath)
    if (tmpPicPath && !this.data.imgByOpen) {
      var fileName = tmpPicPath.substr(tmpPicPath.lastIndexOf("/") + 1);
      var picPath = `${wx.env.USER_DATA_PATH}/pic_inpaint_${fileName}`;
      console.log('picPath: ', picPath)
      wx.getFileSystemManager().copyFileSync(tmpPicPath, picPath)
      wx.getImageInfo({
        src: picPath,
        success: function (res) {
          console.log('here:', res)
          console.log('width:', res.width)
          let [height, width] = [Math.floor(that.data.windowWidth / res.width * res.height), that.data.windowWidth];
          if (height > that.data.windowHeight - 120) {
            height = that.data.windowHeight - 120;
            width = Math.floor(height / res.height * res.width);
          };
          if (that.data.isCropped) {
            that.clearCroppedImage();
          }
          that.setData({
            canvasHeight: height,
            canvasWidth: width,
            cover: picPath,
            hasChoosedImg: true,
          });
          that.initCanvas();
        }

      })
    } 
    // 在这里处理从Cropper页面返回时的逻辑
    if (getApp().globalData.returnFromCropper) {
      if (this.data._isCropChanged) {
        const croppedImage = await imageProcessor.cropImage(this.data.cover, this.data.croppedImageData);
        this.setData({
          _isCropChanged: false,
          isCropped: true,
          croppedCover: croppedImage
        });
        this.clearRect();
      }
      getApp().globalData.returnFromCropper = false;
    };
  },

  onShareAppMessage: function (options) {
    return {
      title: '吉吉修图',
      imageUrl: '/images/mini_code.jpg',
      path: '/pages/painting2/painting2'
    }
  },
  onShareTimeline: function () {
    return {
      title: '吉吉修图',
      imageUrl: '/images/mini_code.jpg',
      query: ''
    }
  },
  onAddToFavorites: function (options) {
    return {
      title: '吉吉修图',
      imageUrl: '/images/mini_code.jpg',
      query: '',
    }
  },

  colorChange(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      selectColor: color
    })
    penType = 'drawPen';
  },

  sizeHandler(e) {
    const size = e.detail.value;
    this.setData({
      selectSize: size
    })
  },

  // 使用橡皮檫
  rubberHandler() {
    penType = 'clearPen';
    this.setData({
      selectColor: ""
    })
  },
  //初始化画布
  initCanvas() {
    const This = this.data;
    const query = wx.createSelectorQuery("#myCanvas");
    query.select('#myCanvas').fields({
      node: true,
      size: true,
      context: true
    }).exec(res => {
      const canvas = res[0].node;
      const context = canvas.getContext('2d');
      // 获取设备像素比
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const width = res[0].width * dpr;
      const height = res[0].height * dpr;
      canvas.width = width;
      canvas.height = height;
      // 填充背景颜色
      context.fillStyle = "transparent";
      context.fillRect(0, 0, width, height);
      // 缩放
      context.scale(dpr, dpr);
      // 设置默认属性
      //context.globalAlpha = 0.5;
      //context.globalCompositeOperation = "destination-over";
      context.strokeStyle = This.selectColor;
      context.lineWidth = This.selectSize;
      this.setData({
        canvasElement: canvas,
        canvasContext: context,        
        imgByOpen: false,
      })
    })
  },
  // 开始
  startTouchClick(e) {
    var that = this;
    const x = e.touches[0].x;
    const y = e.touches[0].y;
    that.setData({
      oldPosition: {
        x: x,
        y: y
      },
    });
    if (that.data.selectColor !== "") {
      that.clearRect();
    };
  },

  // 移动
  moveClick(e) {
    if (!this.data.isDraw) {
      this.setData({
        isDraw: true,
      })
    }
    let positionItem = e.touches[0]
    if (this.data.canvasContext) {
      this.drawCanvas(positionItem, true)
    } else {
      this.initCanvas(() => {
        this.drawCanvas(positionItem, true)
      })
    }
  },

  // 描绘canvas
  drawCanvas(position) {
    const ctx = this.data.canvasContext;
    const size = this.data.selectSize;
    const color = this.data.selectColor;
    const This = this.data;
    if (ctx) {
      ctx.beginPath();
      ctx.lineWidth = size;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      if (penType == 'clearPen') {
        const radius = size + 1;
        ctx.clearRect(position.x - (radius / 2), position.y - (radius / 2), radius, radius);
      } else {
        ctx.moveTo(This.oldPosition.x, This.oldPosition.y);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
      };
      ctx.closePath();
      this.setData({
        oldPosition: {
          x: position.x,
          y: position.y,
        }
      })
    }
  },
  //触摸结束
  endTouchClick(e) {
    if (this.data.isDraw) {
      this.saveImage();
    };
  },
  //误触事件
  errorClick(e) {
    console.log("误触事件：", e);
  },
  // 是否展示 操作栏
  showBarsHandler() {
    this.setData({
      showBars: !this.data.showBars
    })
  },
  hideBarsHandler() {
    this.setData({
      showBars: false
    })
  },

  async scaleUpMask() {
    await this.scaleMask(true);
  },

  async scaleDownMask() {
    await this.scaleMask(false);
  },

  async scaleMask(isUp) {
    try {
      let maskUrl = this.data.imageList[0];
      let resultPath = await imageProcessor.scaleMask(maskUrl, this.data.migan, this.data.selectColor, isUp);
      const ctx = this.data.canvasContext;
      const canvas = this.data.canvasElement;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const image = canvas.createImage();
      await new Promise(function (resolve, reject) {
        image.onload = resolve;
        image.src = resultPath;
      });
      let dpr =this.data.dpr;
      ctx.scale(1 / dpr, 1 / dpr);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      this.data.imageList[0] = resultPath;
    } catch (error) {
      console.error('掩码图像出错：', error);
    }
  },

  // 回退一步
  restore() {
    if (this.data.previousCover) {
      this.setData({
        cover: this.data.previousCover,
        imageList: [],
        isDraw: false
      });
      this.setPreviousCover();
    };
    this.clearRect();
  },

  setPreviousCover() {
    if (this.data.previousCover && this.data.previousCover.startsWith("http://usr/")) {
      // 删除临时文件
      wx.getFileSystemManager().unlink({
        filePath: this.data.previousCover,
        success: (res) => {
          //console.log('临时文件删除成功', res);
        },
        fail: (err) => {
          //console.log('临时文件删除失败', err);
        }
      });
    };

    this.setData({
      previousCover: null,
      hasPreviousCover: false
    });
  },

  cropper() {
    if (this.data.hasChoosedImg) {
      wx.navigateTo({
        url: `../cropper/cropper?imgSrc=${this.data.cover}&width=${this.data.canvasWidth}&height=${this.data.canvasHeight}`
      })
    }
  },

  // 清空画布
  clearRect() {
    if (this.data.canvasContext) {
      const ctx = this.data.canvasContext;
      const canvas = this.data.canvasElement;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.setData({
        imageList: [],
        isDraw: false,
        hasMask: false
      });
    }
  },

  // 保存图片
  saveImage() {
    const that = this;
    wx.canvasToTempFilePath({
      canvasId: 'myCanvas',
      canvas: this.data.canvasElement,
      success: function (res) {
        const tmpPicPath = res.tempFilePath;
        const fileName = tmpPicPath.substr(tmpPicPath.lastIndexOf("/") + 1)
        const maskPicPath = `${wx.env.USER_DATA_PATH}/pic_inpaint_${fileName}.png`;
        wx.getFileSystemManager().saveFile({
          tempFilePath: tmpPicPath,
          filePath: maskPicPath,
          success: (res) => {
            that.data.imageList[0] = maskPicPath;
            that.setData({
              hasMask: true
            })
          }
        });
      },
      fail: function (err) {}
    })
  },

  async save() {
    if (!this.data.hasChoosedImg) {
      wx.showToast({
        title: '请选择图片',
        icon: 'error',
        duration: 2000
      })
      return
    }
    const filePath = this.data.cover;
    try {
      const res = await new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath: filePath,
          success: resolve,
          fail: reject
        });
      });
      // wx.showToast({
      //   title: '生成图片已成功保存到相册',
      //   icon: 'none'
      // });
      this.setPreviousCover();
      // 清理操作
      this.clearRect();
      if (this.data.isCropped) {
        this.clearCroppedImage();
      }

    } catch (error) {
      if (error.errMsg === 'saveImageToPhotosAlbum:fail auth deny') {
        wx.showToast({
          title: '请授权保存图片权限以保存分享图',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '生成图片失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  //装载图片
  openFile() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: function (res) {
        const tmpPicPath = res.tempFiles[0].tempFilePath
        const fileName = tmpPicPath.substr(tmpPicPath.lastIndexOf("/") + 1)
        const picPath = `${wx.env.USER_DATA_PATH}/pic_inpaint_${fileName}`;
        wx.getFileSystemManager().saveFileSync(tmpPicPath, picPath)
        wx.getImageInfo({
          src: picPath,
          success: function (res) {
            let [height, width] = [Math.floor(that.data.windowWidth / res.width * res.height), that.data.windowWidth];
            if (height > that.data.windowHeight - 120) {
              height = that.data.windowHeight - 120;
              width = Math.floor(height / res.height * res.width);
            };
            if (that.data.isCropped) {
              that.clearCroppedImage();
            }
            that.setData({
              canvasHeight: height,
              canvasWidth: width,
              cover: picPath,
              hasChoosedImg: true,
              imgByOpen: true,
            });
            that.initCanvas();
          }

        })
      }
    })
  },

  //reloadModel
  reloadModel() {
    this.hideBarsHandler();
    this.data.migan.dispose();
    // Load the module
    wx.showLoading({
      title: '模型正在加载...'
    });
    const migan = new Migan();
    migan.load(true).then(() => {
      wx.hideLoading();
    }).catch(err => {
      console.log('模型加载报错：', err);
      wx.showToast({
        title: '模型加载失败，请重试',
        icon: 'none',
        duration: 2000,
      });

    });
    this.setData({
      migan: migan
    });
    wx.hideLoading();

  },

  //inPaint
  async inPaint() {
    /*
    if (!this.data.migan.isReady()) {
      // console.log("the module is not loaded");
      return;
    };

    */
    if (!this.data.hasChoosedImg) {
      wx.showToast({
        title: '请选择图片',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (!this.data.hasMask) {
      wx.showToast({
        title: '请选择要消除的区域',
        icon: 'error',
        duration: 2000
      })
      return
    }
    if (this.data.isDraw) {
      try {
        // 在 canvas 中显示处理结果的临时文件路径
        const imageInfo = {
          cover: this.data.cover,
          croppedCover: this.data.croppedCover,
          isCropped: this.data.isCropped,
          croppedImageData: this.data.croppedImageData
        };
        let maskUrl = this.data.imageList[0];
        let resultPath = await imageProcessor.inPaint(imageInfo, maskUrl, this.data.migan, this.data.selectColor);
        // 更新页面数据，显示处理结果的图片路径
        if (this.data.isCropped) {
          this.clearCroppedImage();
        }
        const ctx = this.data.canvasContext;
        const canvas = this.data.canvasElement;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.setData({
          previousCover: this.data.cover,
          hasPreviousCover: true
        }, () => {
          this.setData({
            cover: resultPath,
            imageList: [],
            isDraw: false,
            hasMask: false
          });
        });

      } catch (error) {
        console.error('图像处理出错：', error);
      }
    }
  }
})