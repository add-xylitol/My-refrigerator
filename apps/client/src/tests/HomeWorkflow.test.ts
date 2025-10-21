import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFridgeStore, type Item } from '../stores/fridgeStore';
import { act } from '@testing-library/react';

// 模拟日期
const mockDate = new Date('2023-06-15');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

// 辅助函数，用于获取特定层位的食材
const getItemsByShelfId = (items: Item[], shelfId: string): Item[] => {
  return items.filter(item => item.shelfId === shelfId);
};

// 辅助函数，用于获取临期食材（到期日≤2天）
const getExpiringItems = (items: Item[]): Item[] => {
  const today = new Date();
  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(today.getDate() + 2);
  
  return items.filter(item => {
    if (!item.expDate) return false;
    const expDate = new Date(item.expDate);
    return expDate <= twoDaysLater;
  });
};

describe('Home Workflow 测试', () => {
  // 每个测试前重置状态（使用现有的方法）
  beforeEach(() => {
    const store = useFridgeStore.getState();
    // 由于没有resetStore方法，我们使用现有的方法重置状态
    act(() => {
      store.resetShelves();
      [...store.items].forEach((item) => {
        store.removeItem(item.id);
      });
      [...store.condiments].forEach((condiment) => {
        store.removeCondiment(condiment.id);
      });
    });
  });

  describe('快速入库卡片功能', () => {
    it('应该能够通过手动登记添加新食材', () => {
      const store = useFridgeStore.getState();
      const initialCount = store.items.length;
      const shelfId = store.shelves[0].id;
      
      // 模拟选择层位
      act(() => {
        store.setSelectedShelf(shelfId);
      });
      
      // 模拟手动登记添加食材
      act(() => {
        store.addItem({
          shelfId: shelfId,
          name: '牛奶',
          qty: 2,
          unit: '个',
          expDate: '2023-06-20'
        });
      });
      
      // 验证库存是否增加
      expect(store.items.length).toBe(initialCount + 1);
      const addedItem = store.items.find(item => item.name === '牛奶');
      expect(addedItem).toBeTruthy();
      expect(addedItem?.name).toBe('牛奶');
    });
    
    it('应该能够通过拍照/相册添加新食材', () => {
      const store = useFridgeStore.getState();
      const initialCount = store.items.length;
      const shelfId = store.shelves.find(shelf => shelf.type === 'freeze')?.id || store.shelves[0].id;
      
      // 模拟选择层位
      act(() => {
        store.setSelectedShelf(shelfId);
      });
      
      // 模拟拍照/相册添加食材（实际上与手动添加调用相同方法，但来源不同）
      act(() => {
        store.addItem({
          shelfId: shelfId,
          name: '冻鱼',
          qty: 1,
          unit: '袋',
          expDate: '2023-08-15',
          photoUrl: 'photo://local-image-1'
        });
      });
      
      // 验证库存是否增加
      expect(store.items.length).toBe(initialCount + 1);
      const addedItem = store.items.find(item => item.name === '冻鱼');
      expect(addedItem).toBeTruthy();
      expect(addedItem?.photoUrl).toBe('photo://local-image-1');
    });
  });

  describe('层位选择与库存展示功能', () => {
    it('选择层位后应该只展示该层的食材', () => {
      const store = useFridgeStore.getState();
      const shelf1 = store.shelves[0].id;
      const shelf2 = store.shelves[1].id;
      
      // 添加不同层位的食材
      act(() => {
        store.addItem({
          shelfId: shelf1,
          name: '鸡蛋',
          qty: 10,
          unit: '个',
          expDate: '2023-06-25'
        });
        
        store.addItem({
          shelfId: shelf2,
          name: '猪肉',
          qty: 500,
          unit: '克',
          expDate: '2023-06-18'
        });
      });
      
      // 选择第一个层位
      act(() => {
        store.setSelectedShelf(shelf1);
      });
      
      // 验证只显示第一层食材
      const displayedItems = getItemsByShelfId(store.items, shelf1);
      expect(displayedItems.length).toBe(1);
      expect(displayedItems[0].name).toBe('鸡蛋');
      
      // 选择第二个层位
      act(() => {
        store.setSelectedShelf(shelf2);
      });
      
      // 验证只显示第二层食材
      const newDisplayedItems = getItemsByShelfId(store.items, shelf2);
      expect(newDisplayedItems.length).toBe(1);
      expect(newDisplayedItems[0].name).toBe('猪肉');
    });
    
    it('应该能够查看所有层位的食材', () => {
      const store = useFridgeStore.getState();
      const shelf1 = store.shelves[0].id;
      const shelf2 = store.shelves[1].id;
      
      // 添加不同层位的食材
      act(() => {
        store.addItem({
          shelfId: shelf1,
          name: '西红柿',
          qty: 3,
          unit: '个',
          expDate: '2023-06-20'
        });
        
        store.addItem({
          shelfId: shelf2,
          name: '黄瓜',
          qty: 2,
          unit: '个',
          expDate: '2023-06-19'
        });
      });
      
      // 选择特定层位
      act(() => {
        store.setSelectedShelf(shelf1);
      });
      
      // 验证只显示特定层位食材
      const shelfItems = getItemsByShelfId(store.items, shelf1);
      expect(shelfItems.length).toBe(1);
      
      // 验证所有食材
      expect(store.items.length).toBe(2);
    });
  });

  describe('列表项编辑和删除功能', () => {
    it('应该能够编辑食材的数量和到期日期', () => {
      const store = useFridgeStore.getState();
      const shelfId = store.shelves[0].id;
      
      // 添加测试食材
      act(() => {
        store.addItem({
          shelfId: shelfId,
          name: '酸奶',
          qty: 1,
          unit: '个',
          expDate: '2023-06-20'
        });
      });
      
      const addedItem = store.items.find(item => item.name === '酸奶');
      expect(addedItem).toBeTruthy();
      
      if (addedItem) {
        // 编辑食材
        act(() => {
          store.updateItem(addedItem.id, {
            qty: 3,
            expDate: '2023-06-25'
          });
        });
        
        // 验证编辑是否成功
        const updatedItem = store.items.find(item => item.id === addedItem.id);
        expect(updatedItem).toBeTruthy();
        expect(updatedItem?.qty).toBe(3);
        expect(updatedItem?.expDate).toBe('2023-06-25');
        // 确保其他属性未变
        expect(updatedItem?.name).toBe('酸奶');
      }
    });
    
    it('应该能够删除食材', () => {
      const store = useFridgeStore.getState();
      const shelfId = store.shelves[0].id;
      
      // 添加测试食材
      act(() => {
        store.addItem({
          shelfId: shelfId,
          name: '面包',
          qty: 1,
          unit: '袋',
          expDate: '2023-06-18'
        });
      });
      
      const addedItem = store.items.find(item => item.name === '面包');
      expect(addedItem).toBeTruthy();
      
      if (addedItem) {
        const initialCount = store.items.length;
        
        // 删除食材
        act(() => {
          store.removeItem(addedItem.id);
        });
        
        // 验证删除是否成功
        expect(store.items.length).toBe(initialCount - 1);
        expect(store.items.find(item => item.id === addedItem.id)).toBeUndefined();
      }
    });
  });

  describe('临期提醒功能', () => {
    it('应该能够识别到期日≤2天的食材', () => {
      const store = useFridgeStore.getState();
      const shelfId = store.shelves[0].id;
      
      // 添加不同到期日的食材
      act(() => {
        // 今天到期
        store.addItem({
          shelfId: shelfId,
          name: '豆腐',
          qty: 1,
          unit: '个',
          expDate: '2023-06-15' // 今天
        });
        
        // 明天到期
        store.addItem({
          shelfId: shelfId,
          name: '青菜',
          qty: 2,
          unit: '把',
          expDate: '2023-06-16' // 明天
        });
        
        // 后天到期
        store.addItem({
          shelfId: shelfId,
          name: '鸡胸肉',
          qty: 300,
          unit: '克',
          expDate: '2023-06-17' // 后天
        });
        
        // 3天后到期（不应该在临期提醒中）
        store.addItem({
          shelfId: shelfId,
          name: '胡萝卜',
          qty: 3,
          unit: '个',
          expDate: '2023-06-18' // 3天后
        });
      });
      
      // 获取临期食材
      const expiringItems = getExpiringItems(store.items);
      
      // 验证临期食材数量和内容
      expect(expiringItems.length).toBe(3); // 应该有3个临期食材
      expect(expiringItems.find(item => item.name === '豆腐')).toBeTruthy();
      expect(expiringItems.find(item => item.name === '青菜')).toBeTruthy();
      expect(expiringItems.find(item => item.name === '鸡胸肉')).toBeTruthy();
      expect(expiringItems.find(item => item.name === '胡萝卜')).toBeUndefined();
    });
  });
});