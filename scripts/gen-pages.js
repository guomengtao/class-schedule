var fs = require('fs');
var path = require('path');

var pages = [
  { dir: 'demo-animal',  name: '动物', data: ['猫','狗','兔子','狐狸','熊猫','考拉','狮子','老虎','大象','猴子'], accent: '#7ec8e3' },
  { dir: 'demo-phone',   name: '手机', data: ['iPhone','华为','小米','OPPO','vivo','三星','荣耀','一加','魅族','联想'], accent: '#e74c3c' },
  { dir: 'demo-car',     name: '汽车', data: ['奔驰','宝马','奥迪','特斯拉','丰田','本田','福特','保时捷','法拉利','兰博基尼'], accent: '#3498db' },
  { dir: 'demo-fruit',   name: '水果', data: ['苹果','香蕉','橙子','葡萄','西瓜','草莓','芒果','蓝莓','樱桃','桃子'], accent: '#2ecc71' },
  { dir: 'demo-color',   name: '颜色', data: ['红色','蓝色','绿色','黄色','紫色','橙色','粉色','白色','黑色','灰色'], accent: '#f39c12' },
  { dir: 'demo-city',    name: '城市', data: ['北京','上海','广州','深圳','杭州','成都','南京','武汉','西安','重庆'], accent: '#9b59b6' },
  { dir: 'demo-music',   name: '乐器', data: ['钢琴','吉他','小提琴','大提琴','长笛','萨克斯','架子鼓','二胡','古筝','琵琶'], accent: '#e67e22' },
  { dir: 'demo-sport',   name: '运动', data: ['足球','篮球','网球','游泳','跑步','瑜伽','滑雪','拳击','攀岩','骑行'], accent: '#1abc9c' },
  { dir: 'demo-book',    name: '书籍', data: ['红楼梦','西游记','三国演义','水浒传','论语','史记','诗经','楚辞','道德经','孙子兵法'], accent: '#34495e' },
  { dir: 'demo-movie',   name: '电影', data: ['肖申克救赎','霸王别姬','阿甘正传','泰坦尼克号','盗梦空间','星际穿越','千与千寻','龙猫','天空之城','你的名字'], accent: '#e91e63' },
  { dir: 'demo-star',    name: '星座', data: ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座'], accent: '#ff9800' },
  { dir: 'demo-lang',    name: '语言', data: ['中文','英语','日语','韩语','法语','德语','西班牙语','俄语','阿拉伯语','葡萄牙语'], accent: '#00bcd4' },
  { dir: 'demo-furniture', name: '家具', data: ['桌子','椅子','沙发','床','衣柜','书架','茶几','鞋柜','梳妆台','电视柜'], accent: '#795548' }
];

function esc(s) { return JSON.stringify(s); }

function baseStyle() {
  return '  .demo-page{flex-direction:column;padding:16px;height:100%}\n' +
    '  .header{flex-direction:row;align-items:center;padding:12px 4px;margin-bottom:8px}\n' +
    '  .back-btn{width:56px;height:44px;border-radius:10px;font-size:18px;text-align:center}\n' +
    '  .title{font-size:28px;font-weight:bold;margin-left:10px;flex:1}\n' +
    '  .add-row{flex-direction:row;align-items:center;padding:8px 0;margin-bottom:12px}\n' +
    '  .add-btn{flex:1;height:48px;border-radius:12px;font-size:20px;font-weight:bold;text-align:center}\n' +
    '  .list{flex:1;flex-direction:column}\n' +
    '  .footer{padding:8px 0;border-top:1px solid;margin-top:8px;align-items:center}\n' +
    '  .footer-text{font-size:16px}\n';
}

function sharedScript(storageKey, data, extraPrivate, extraMethods) {
  return '<script>\n' +
    'import router from "@system.router"\n' +
    'import prompt from "@system.prompt"\n' +
    'var storage = require("@system.storage")\n' +
    'var store = require("../../data/store.js")\n' +
    'var STORAGE_KEY = ' + esc(storageKey) + '\n' +
    'var DEFAULT_DATA = ' + JSON.stringify(data) + '\n' +
    '\n' +
    'export default {\n' +
    '  private: {\n' +
    '    theme: {},\n' +
    '    listData: [],\n' +
    '    swipedIdx: -1,\n' +
    '    touchStartX: 0\n' +
    (extraPrivate ? '    ,' + extraPrivate + '\n' : '') +
    '  },\n' +
    '  onInit: function() {\n' +
    '    var self = this\n' +
    '    store.getTheme(function(t) { self.theme = t })\n' +
    '    this.loadData()\n' +
    '  },\n' +
    '  onShow: function() {\n' +
    '    var self = this\n' +
    '    store.getTheme(function(t) { self.theme = t })\n' +
    '    this.loadData()\n' +
    '  },\n' +
    '  loadData: function() {\n' +
    '    var self = this\n' +
    '    storage.get({\n' +
    '      key: STORAGE_KEY,\n' +
    '      success: function(data) {\n' +
    '        if (data) {\n' +
    '          try { var list = JSON.parse(data); self.listData = (list && list.length > 0) ? list : DEFAULT_DATA.slice() }\n' +
    '          catch (e) { self.listData = DEFAULT_DATA.slice() }\n' +
    '        } else { self.listData = DEFAULT_DATA.slice() }\n' +
    '        self.swipedIdx = -1\n' +
    '      },\n' +
    '      fail: function() { self.listData = DEFAULT_DATA.slice(); self.swipedIdx = -1 }\n' +
    '    })\n' +
    '  },\n' +
    '  saveData: function() {\n' +
    '    storage.set({ key: STORAGE_KEY, value: JSON.stringify(this.listData) })\n' +
    '  },\n' +
    '  showAddDialog: function() {\n' +
    '    var self = this\n' +
    '    prompt.showDialog({\n' +
    '      title: "添加", message: "输入名称", edittype: "text", value: "",\n' +
    '      buttons: [\n' +
    '        { text: "取消", color: "#888899" },\n' +
    '        { text: "确定", color: "#7ec8e3", onclick: function(_err, d) {\n' +
    '          if (d && d.value) {\n' +
    '            var name = d.value.trim()\n' +
    '            if (!name) return\n' +
    '            for (var i = 0; i < self.listData.length; i++) {\n' +
    '              if (self.listData[i] === name) { prompt.showToast({ message: "已存在", duration: 300 }); return }\n' +
    '            }\n' +
    '            self.listData.push(name); self.saveData()\n' +
    '            prompt.showToast({ message: "已添加", duration: 300 })\n' +
    '          }\n' +
    '        }}\n' +
    '      ]\n' +
    '    })\n' +
    '  },\n' +
    '  onItemClick: function(idx) {\n' +
    '    if (this.swipedIdx !== -1) { this.swipedIdx = -1; return }\n' +
    '    this.showMenu(idx)\n' +
    '  },\n' +
    '  showMenu: function(idx) {\n' +
    '    var self = this; var item = this.listData[idx]; if (!item) return\n' +
    '    prompt.showDialog({\n' +
    '      title: item, message: "选择操作",\n' +
    '      buttons: [\n' +
    '        { text: "编辑", color: "#7ec8e3", onclick: function() { self.startEdit(idx) } },\n' +
    '        { text: "复制", color: "#7ec8e3", onclick: function() { self.copyItem(idx) } },\n' +
    '        { text: "删除", color: "#e74c3c", onclick: function() { self.confirmDelete(idx) } },\n' +
    '        { text: "取消", color: "#888899" }\n' +
    '      ]\n' +
    '    })\n' +
    '  },\n' +
    '  startEdit: function(idx) {\n' +
    '    var self = this; var item = this.listData[idx]\n' +
    '    prompt.showDialog({\n' +
    '      title: "编辑", message: "输入新名称", edittype: "text", value: item,\n' +
    '      buttons: [\n' +
    '        { text: "取消", color: "#888899" },\n' +
    '        { text: "保存", color: "#7ec8e3", onclick: function(_err, d) {\n' +
    '          if (d && d.value) {\n' +
    '            var nn = d.value.trim()\n' +
    '            if (nn && nn !== item) {\n' +
    '              for (var i = 0; i < self.listData.length; i++) {\n' +
    '                if (i !== idx && self.listData[i] === nn) { prompt.showToast({ message: "名称已存在", duration: 300 }); return }\n' +
    '              }\n' +
    '              self.listData[idx] = nn; self.saveData()\n' +
    '              prompt.showToast({ message: "已更新", duration: 300 })\n' +
    '            }\n' +
    '          }\n' +
    '        }}\n' +
    '      ]\n' +
    '    })\n' +
    '  },\n' +
    '  copyItem: function(idx) {\n' +
    '    var item = this.listData[idx]; var nn = item + " (副本)"; var ex = false\n' +
    '    for (var i = 0; i < this.listData.length; i++) { if (this.listData[i] === nn) { ex = true; break } }\n' +
    '    if (ex) {\n' +
    '      var c = 1\n' +
    '      while (true) {\n' +
    '        var tn = item + " (副本" + c + ")"; var fd = false\n' +
    '        for (var i = 0; i < this.listData.length; i++) { if (this.listData[i] === tn) { fd = true; break } }\n' +
    '        if (!fd) { nn = tn; break }\n' +
    '        c++\n' +
    '      }\n' +
    '    }\n' +
    '    this.listData.push(nn); this.saveData()\n' +
    '    prompt.showToast({ message: "已复制", duration: 300 })\n' +
    '  },\n' +
    '  confirmDelete: function(idx) {\n' +
    '    var self = this; var item = this.listData[idx]\n' +
    '    prompt.showDialog({\n' +
    '      title: "删除", message: \'删除 "\' + item + \'" ?\',\n' +
    '      buttons: [\n' +
    '        { text: "取消", color: "#888899" },\n' +
    '        { text: "确定", color: "#e74c3c", onclick: function() {\n' +
    '          self.listData.splice(idx, 1); self.swipedIdx = -1; self.saveData()\n' +
    '          prompt.showToast({ message: "已删除", duration: 300 })\n' +
    '        }}\n' +
    '      ]\n' +
    '    })\n' +
    '  },\n' +
    '  goBack: function() { router.back() },\n' +
    (extraMethods ? extraMethods : '') +
    '}\n' +
    '</script>\n';
}

function swipeMethods() {
  return '  onTouchStart: function(e, _idx) {\n' +
    '    if (!e || !e.touches || e.touches.length === 0) return\n' +
    '    this.touchStartX = e.touches[0].clientX\n' +
    '  },\n' +
    '  onTouchEnd: function(e, idx) {\n' +
    '    if (!e || !e.changedTouches || e.changedTouches.length === 0) return\n' +
    '    var dx = e.changedTouches[0].clientX - this.touchStartX\n' +
    '    var adx = dx < 0 ? -dx : dx\n' +
    '    if (adx > 30) {\n' +
    '      if (dx < 0) { this.swipedIdx = idx }\n' +
    '      else { if (this.swipedIdx === idx) { this.swipedIdx = -1 } }\n' +
    '    }\n' +
    '  },\n';
}

function swipeCSS() {
  return '  .item-wrapper{flex-direction:row;align-items:center;margin-bottom:24px}\n' +
    '  .list-item{flex:1;flex-direction:row;justify-content:space-between;align-items:center}\n' +
    '  .delete-btn{width:72px;height:72px;background-color:#e74c3c;border-radius:10px;justify-content:center;align-items:center;margin-left:8px;flex-shrink:0}\n' +
    '  .delete-icon{font-size:18px;color:#ffffff}\n';
}

function headerHTML(accent) {
  return '    <div class="header">\n' +
    '      <input class="back-btn" type="button" value="&#9664;" onclick="goBack" style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />\n' +
    '      <text class="title" style="color: {{ theme.text }}">{{ pageTitle }}</text>\n' +
    '    </div>\n';
}

function addBtnHTML(accent) {
  return '    <div class="add-row">\n' +
    '      <input class="add-btn" type="button" value="+ 添加" onclick="showAddDialog" style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />\n' +
    '    </div>\n';
}

function footerHTML() {
  return '    <div class="footer" style="border-top: 1px solid {{ theme.border }}">\n' +
    '      <text class="footer-text" style="color: {{ theme.textMuted }}">共 {{ listData.length }} 个</text>\n' +
    '    </div>\n';
}

// ============ LAYOUT 1: Classic Row with Left Border Accent ============
function layout1(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="item-wrapper">\n' +
      '        <div class="list-item" style="background-color: {{ theme.card }}; border-left: 6px solid ' + a + '; border-radius: 14px; padding: 60px 24px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <text class="item-name" style="font-size: 36px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '          <text class="item-index" style="font-size: 28px; color: {{ theme.textMuted }}">#{{ $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() + swipeCSS() + '</style>\n',
    extraMethods: swipeMethods()
  };
}

// ============ LAYOUT 2: Grid Cards (2 per row) ============
function layout2(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list grid-list">\n' +
      '      <div for="{{ listData }}" class="grid-card" onclick="onItemClick($idx)" style="background-color: {{ theme.card }}; border: 2px solid ' + a + '">\n' +
      '        <text class="grid-label" style="font-size: 30px; font-weight: bold; color: ' + a + '; text-align: center">{{ $item }}</text>\n' +
      '        <text class="grid-num" style="font-size: 20px; color: {{ theme.textMuted }}; text-align: center">#{{ $idx + 1 }}</text>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .grid-list{flex-direction:row;flex-wrap:wrap;align-content:flex-start}\n' +
      '  .grid-card{width:46%;height:120px;border-radius:16px;margin:2%;flex-direction:column;justify-content:center;align-items:center}\n' +
      '</style>\n',
    extraMethods: ''
  };
}

// ============ LAYOUT 3: Timeline with Dots ============
function layout3(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="tl-row" onclick="onItemClick($idx)">\n' +
      '        <div class="tl-track" style="background-color: ' + a + '">\n' +
      '          <div class="tl-dot" style="background-color: ' + a + '"></div>\n' +
      '        </div>\n' +
      '        <div class="tl-card" style="background-color: {{ theme.card }}; border: 1px solid ' + a + '">\n' +
      '          <text class="tl-name" style="font-size: 32px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '          <text class="tl-idx" style="font-size: 22px; color: ' + a + '">#{{ $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .tl-row{flex-direction:row;min-height:90px}\n' +
      '  .tl-track{width:4px;flex-direction:column;align-items:center;margin-left:14px;margin-right:16px}\n' +
      '  .tl-dot{width:14px;height:14px;border-radius:7px;margin-top:22px}\n' +
      '  .tl-card{flex:1;border-radius:12px;padding:20px 18px;margin-bottom:20px;flex-direction:row;justify-content:space-between;align-items:center}\n' +
      '</style>\n',
    extraMethods: ''
  };
}

// ============ LAYOUT 4: Alternating Striped Rows ============
function layout4(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="stripe-wrapper">\n' +
      '        <div class="stripe-item" style="{{ $idx % 2 === 0 ? \'background-color: \' + theme.card + \';\' : \'background-color: transparent;\' }} padding: 50px 24px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <text class="stripe-name" style="font-size: 36px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '          <text class="stripe-idx" style="font-size: 28px; color: ' + a + '">#{{ $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .stripe-wrapper{flex-direction:row;align-items:center;margin-bottom:4px}\n' +
      '  .stripe-item{flex:1;flex-direction:row;justify-content:space-between;align-items:center}\n' +
      '  .delete-btn{width:72px;height:72px;background-color:#e74c3c;border-radius:10px;justify-content:center;align-items:center;margin-left:8px;flex-shrink:0}\n' +
      '  .delete-icon{font-size:18px;color:#ffffff}\n' +
      '</style>\n',
    extraMethods: swipeMethods()
  };
}

// ============ LAYOUT 5: Color Swatch Blocks ============
function layout5(page) {
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(page.accent) + addBtnHTML(page.accent) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="swatch-card" onclick="onItemClick($idx)" style="{{ getSwatchStyle($idx) }}">\n' +
      '        <text class="swatch-name" style="font-size: 34px; font-weight: bold; color: {{ getSwatchTextColor($idx) }}">{{ $item }}</text>\n' +
      '        <text class="swatch-idx" style="font-size: 24px; color: {{ getSwatchTextColor($idx) }}">#{{ $idx + 1 }}</text>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .swatch-card{flex-direction:row;justify-content:space-between;align-items:center;border-radius:16px;padding:50px 24px;margin-bottom:16px}\n' +
      '</style>\n',
    extraMethods: '  getSwatchStyle: function(idx) {\n' +
      '    var colors = ["#e74c3c","#3498db","#2ecc71","#f1c40f","#9b59b6","#e67e22","#e91e63","#ffffff","#222222","#888888"]\n' +
      '    var c = colors[idx % colors.length]\n' +
      '    return "background-color: " + c + "; border-radius: 16px; padding: 50px 24px; margin-bottom: 16px"\n' +
      '  },\n' +
      '  getSwatchTextColor: function(idx) {\n' +
      '    var light = ["#f1c40f","#ffffff","#888888"]\n' +
      '    var colors = ["#e74c3c","#3498db","#2ecc71","#f1c40f","#9b59b6","#e67e22","#e91e63","#ffffff","#222222","#888888"]\n' +
      '    var c = colors[idx % colors.length]\n' +
      '    for (var i = 0; i < light.length; i++) { if (c === light[i]) return "#222222" }\n' +
      '    return "#ffffff"\n' +
      '  },\n'
  };
}

// ============ LAYOUT 6: Big Initial Badge ============
function layout6(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="item-wrapper">\n' +
      '        <div class="list-item" style="background-color: {{ theme.card }}; border-radius: 14px; padding: 40px 20px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <div class="badge" style="background-color: ' + a + '"><text class="badge-text" style="font-size: 36px; font-weight: bold; color: #ffffff">{{ $item.charAt(0) }}</text></div>\n' +
      '          <text class="badge-name" style="font-size: 34px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '          <text class="badge-idx" style="font-size: 24px; color: {{ theme.textMuted }}">#{{ $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() + swipeCSS() +
      '  .badge{width:56px;height:56px;border-radius:12px;justify-content:center;align-items:center;flex-shrink:0}\n' +
      '  .badge-name{flex:1;margin-left:16px}\n' +
      '</style>\n',
    extraMethods: swipeMethods()
  };
}

// ============ LAYOUT 7: Horizontal Scroll Cards ============
function layout7(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <scroll class="h-scroll" scroll-x="{{true}}">\n' +
      '      <div for="{{ listData }}" class="h-card" onclick="onItemClick($idx)" style="background-color: {{ theme.card }}; border: 2px solid ' + a + '">\n' +
      '        <div class="h-icon" style="background-color: ' + a + '"><text class="h-icon-text" style="font-size: 36px; font-weight: bold; color: #ffffff">{{ $item.charAt(0) }}</text></div>\n' +
      '        <text class="h-name" style="font-size: 26px; font-weight: bold; color: {{ theme.text }}; text-align: center">{{ $item }}</text>\n' +
      '        <text class="h-idx" style="font-size: 18px; color: ' + a + '; text-align: center">#{{ $idx + 1 }}</text>\n' +
      '      </div>\n' +
      '    </scroll>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .h-scroll{flex:1;flex-direction:row;height:216px}\n' +
      '  .h-card{width:160px;height:196px;border-radius:18px;flex-direction:column;justify-content:center;align-items:center;margin-right:14px;flex-shrink:0}\n' +
      '  .h-icon{width:64px;height:64px;border-radius:32px;justify-content:center;align-items:center;margin-bottom:12px}\n' +
      '</style>\n',
    extraMethods: ''
  };
}

// ============ LAYOUT 8: Pill Tag Cloud ============
function layout8(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list tag-list">\n' +
      '      <div for="{{ listData }}" class="tag-pill" onclick="onItemClick($idx)" style="background-color: ' + a + '">\n' +
      '        <text class="tag-text" style="font-size: 28px; font-weight: bold; color: #ffffff">{{ $item }}</text>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .tag-list{flex-direction:row;flex-wrap:wrap;align-content:flex-start;padding:8px 0}\n' +
      '  .tag-pill{height:60px;border-radius:30px;justify-content:center;align-items:center;padding:0 24px;margin-right:12px;margin-bottom:14px;flex-shrink:0}\n' +
      '</style>\n',
    extraMethods: ''
  };
}

// ============ LAYOUT 9: Large Numbered List ============
function layout9(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="item-wrapper">\n' +
      '        <div class="list-item" style="background-color: {{ theme.card }}; border-radius: 10px; padding: 40px 20px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <text class="num-big" style="font-size: 48px; font-weight: bold; color: ' + a + '">{{ $idx < 9 ? "0" + ($idx + 1) : $idx + 1 }}</text>\n' +
      '          <text class="num-name" style="font-size: 32px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() + swipeCSS() +
      '  .num-big{width:60px;text-align:center}\n' +
      '  .num-name{margin-left:20px}\n' +
      '</style>\n',
    extraMethods: swipeMethods()
  };
}

// ============ LAYOUT 10: Banner Cards ============
function layout10(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="banner-card" onclick="onItemClick($idx)" style="background-color: {{ theme.card }}; border-top: 6px solid ' + a + '">\n' +
      '        <text class="banner-title" style="font-size: 34px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '        <div class="banner-meta">\n' +
      '          <text class="banner-tag" style="font-size: 20px; color: ' + a + '">' + page.name + '</text>\n' +
      '          <text class="banner-idx" style="font-size: 20px; color: {{ theme.textMuted }}">#{{ $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() +
      '  .banner-card{flex-direction:column;border-radius:0 0 14px 14px;padding:30px 20px;margin-bottom:20px}\n' +
      '  .banner-meta{flex-direction:row;justify-content:space-between;margin-top:14px}\n' +
      '</style>\n',
    extraMethods: ''
  };
}

// ============ LAYOUT 11: Circle Avatar List ============
function layout11(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="item-wrapper">\n' +
      '        <div class="list-item" style="background-color: {{ theme.card }}; border-radius: 50px; padding: 30px 20px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <div class="avatar-circle" style="background-color: ' + a + '"><text class="avatar-text" style="font-size: 32px; font-weight: bold; color: #ffffff">{{ $item.charAt(0) }}</text></div>\n' +
      '          <text class="avatar-name" style="font-size: 32px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() + swipeCSS() +
      '  .avatar-circle{width:60px;height:60px;border-radius:30px;justify-content:center;align-items:center;flex-shrink:0}\n' +
      '  .avatar-name{margin-left:18px;flex:1}\n' +
      '</style>\n',
    extraMethods: swipeMethods()
  };
}

// ============ LAYOUT 12: Minimal Dotted Line ============
function layout12(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="item-wrapper">\n' +
      '        <div class="list-item" style="border-bottom: 1px dashed {{ theme.border }}; padding: 44px 8px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <text class="minimal-name" style="font-size: 32px; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '          <text class="minimal-idx" style="font-size: 24px; color: ' + a + '">{{ $idx < 9 ? "0" + ($idx + 1) : $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() + swipeCSS() +
      '  .minimal-name{flex:1}\n' +
      '  .minimal-idx{width:48px;text-align:right}\n' +
      '</style>\n',
    extraMethods: swipeMethods()
  };
}

// ============ LAYOUT 13: Stacked Cards with Depth ============
function layout13(page) {
  var a = page.accent;
  return {
    template: '<template>\n' +
      '  <div class="demo-page" style="background-color: {{ theme.bg }}">\n' +
      headerHTML(a) + addBtnHTML(a) +
      '    <div class="list">\n' +
      '      <div for="{{ listData }}" class="item-wrapper">\n' +
      '        <div class="list-item" style="background-color: {{ theme.card }}; border-radius: 14px; padding: 50px 24px; margin-left: {{ $idx * 6 }}px"\n' +
      '             ontouchstart="onTouchStart($event, $idx)" ontouchend="onTouchEnd($event, $idx)" onclick="onItemClick($idx)">\n' +
      '          <text class="stack-name" style="font-size: 34px; font-weight: bold; color: {{ theme.text }}">{{ $item }}</text>\n' +
      '          <text class="stack-idx" style="font-size: 24px; color: ' + a + '">#{{ $idx + 1 }}</text>\n' +
      '        </div>\n' +
      '        <div class="delete-btn" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)"><text class="delete-icon">&#10005;</text></div>\n' +
      '      </div>\n' +
      '    </div>\n' + footerHTML() +
      '  </div>\n</template>\n',
    style: '<style>\n' + baseStyle() + swipeCSS() +
      '  .stack-name{flex:1}\n' +
      '</style>\n',
    extraMethods: swipeMethods()
  };
}

var layouts = [layout1, layout2, layout3, layout4, layout5, layout6, layout7, layout8, layout9, layout10, layout11, layout12, layout13];

// Generate all pages
pages.forEach(function(page, idx) {
  var layout = layouts[idx](page);
  var extraPrivate = 'pageTitle: ' + esc(page.name + '列表');
  var script = sharedScript('demo_' + page.dir, page.data, extraPrivate, layout.extraMethods);
  var full = layout.template + script + layout.style;
  var filePath = path.join('src', 'pages', page.dir, page.dir + '.ux');
  fs.writeFileSync(filePath, full);
  console.log('Created: ' + page.dir + '/' + page.dir + '.ux');
});

console.log('\nDone! Generated ' + pages.length + ' pages.');