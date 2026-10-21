export const tabsData = [
  {
    name: '更多首页',
    groupList: [
      {
        name: '栏目',
        caseList: [
          { name: '当前进度', path: '/pages/schedule-panel-progress' },
          { name: '剩余课程', path: '/pages/schedule-panel-remaining' },
          { name: '科目色卡', path: '/pages/schedule-panel-subject-color' },
          { name: '倒计时', path: '/pages/schedule-panel-countdown' },
          // 倒数日：与上面「倒计时（下一节课）」不是一回事 —— 这个是事件倒计时（生日/考试/节日）
          { name: '倒数日', path: '/pages/countdown-panel' },
          { name: '智能切换', path: '/pages/schedule-panel-dual-mode' },
          { name: '多彩课表', path: '/pages/schedule-panel-colorful' },
          { name: '简易课表', path: '/pages/schedule-panel-simple' }
        ]
      }
    ]
  }
]
