export default defineAppConfig({
  pages: [
    'pages/fridge/index',
    'pages/discover/index',
    'pages/meals/index',
    'pages/profile/index',
    // Sub-pages (not in tabBar)
    'pages/fridge/detail',
    'pages/fridge/add',
    'pages/discover/recipe',
    'pages/discover/shopping',
    'pages/profile/condiments',
    'pages/profile/shelves',
    'pages/camera/index',
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#050811',
    navigationBarTitleText: '我的冰箱',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#7E8BA3',
    selectedColor: '#A5B4FF',
    backgroundColor: '#0A1020',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/fridge/index', text: '冰箱' },
      { pagePath: 'pages/discover/index', text: '吃什么' },
      { pagePath: 'pages/meals/index', text: '记录' },
      { pagePath: 'pages/profile/index', text: '我的' },
    ],
  },
})
