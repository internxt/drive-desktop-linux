import { AvailableUserProductsIPCMain } from './AvailableUserProductsIPCMain';
import { registerAvailableUserProductsHandlers } from './AvailableUserProductsIPCHandler';
import configStore from '../../../../apps/main/config';
import eventBus from '../../../../apps/main/event-bus';



jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('../../../../apps/main/event-bus', () => ({
  on: jest.fn(),
  emit: jest.fn(),
}));

jest.mock('../services/get-user-available-products-and-store', () => ({
  getUserAvailableProductsAndStore: jest.fn(),
}));


describe('AvailableUserProductsIPCHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get-available-user-products', () => {
    it('should register the handler properly', () => {
      registerAvailableUserProductsHandlers();

      expect(AvailableUserProductsIPCMain.handle).toHaveBeenCalledWith(
        'get-available-user-products',
        expect.any(Function)
      );
    });

    it('should return availableUserProducts properly', async () => {
      const mockProducts = { backups: true };
      jest.spyOn(configStore, 'get').mockReturnValue(mockProducts);

      registerAvailableUserProductsHandlers();
      const handler = (AvailableUserProductsIPCMain.handle as jest.Mock).mock
        .calls[0][1];
      const result = await handler();

      expect(result).toEqual(mockProducts);
      expect(configStore.get).toHaveBeenCalledWith('availableUserProducts');
    });

    it('should throw an error if an uncontrolled error happens', async () => {
      jest.spyOn(configStore, 'get').mockImplementation(() => {
        throw new Error('Unexpected Error');
      });

      registerAvailableUserProductsHandlers();
      const handler = (AvailableUserProductsIPCMain.handle as jest.Mock).mock
        .calls[0][1];

      expect(() => handler()).toThrow('Unexpected Error');
    });
  });

  describe('subscribe-available-user-products', () => {
    it('should register the handler properly', () => {
      registerAvailableUserProductsHandlers();

      expect(AvailableUserProductsIPCMain.on).toHaveBeenCalledWith(
        'subscribe-available-user-products',
        expect.any(Function)
      );
    });

    it('should return availableUserProducts properly', () => {
      const mockEvent = { sender: { send: jest.fn() } };
      const mockProducts = { antivirus: true, backups: true };
      jest.spyOn(configStore, 'get').mockReturnValue(mockProducts);

      registerAvailableUserProductsHandlers();
      const handler = (AvailableUserProductsIPCMain.on as jest.Mock).mock
        .calls[0][1];
      handler(mockEvent);

      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'available-user-products-updated',
        mockProducts
      );
      expect(configStore.get).toHaveBeenCalledWith('availableUserProducts');
    });

    it('should register the event bus handlers properly', () => {
      const eventBusOnSpy = jest.spyOn(eventBus, 'on');

      registerAvailableUserProductsHandlers();

      expect(eventBusOnSpy).toHaveBeenCalledWith(
        'USER_LOGGED_IN',
        expect.any(Function)
      );
      expect(eventBusOnSpy).toHaveBeenCalledWith(
        'GET_USER_AVAILABLE_PRODUCTS',
        expect.any(Function)
      );
      expect(eventBusOnSpy).toHaveBeenCalledWith(
        'USER_AVAILABLE_PRODUCTS_UPDATED',
        expect.any(Function)
      );
    });

    it('should add renderer to subscribers and send immediate update', () => {
      const mockEvent = { 
        sender: { 
          send: jest.fn(),
          once: jest.fn(),
          isDestroyed: jest.fn().mockReturnValue(false)
        } 
      };
      const mockProducts = { antivirus: true, backups: true };
      jest.spyOn(configStore, 'get').mockReturnValue(mockProducts);

      registerAvailableUserProductsHandlers();
      const handler = (AvailableUserProductsIPCMain.on as jest.Mock).mock
        .calls[0][1];
      handler(mockEvent);

      // Should send immediate update
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'available-user-products-updated',
        mockProducts
      );
      
      // Should register destroy listener
      expect(mockEvent.sender.once).toHaveBeenCalledWith(
        'destroyed',
        expect.any(Function)
      );
    });

    it('should broadcast to all subscribed renderers on USER_AVAILABLE_PRODUCTS_UPDATED event', () => {
      const mockRenderer1 = { 
        send: jest.fn(),
        once: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false)
      };
      const mockRenderer2 = { 
        send: jest.fn(),
        once: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false)
      };
      const mockEvent1 = { sender: mockRenderer1 };
      const mockEvent2 = { sender: mockRenderer2 };
      const mockProducts = { antivirus: true, backups: true };
      const eventBusOnSpy = jest.spyOn(eventBus, 'on');
      jest.spyOn(configStore, 'get').mockReturnValue(mockProducts);

      registerAvailableUserProductsHandlers();
      
      // Subscribe both renderers
      const subscribeHandler = (AvailableUserProductsIPCMain.on as jest.Mock).mock.calls[0][1];
      subscribeHandler(mockEvent1);
      subscribeHandler(mockEvent2);

      // Get the USER_AVAILABLE_PRODUCTS_UPDATED handler
      const userProductsUpdatedHandler = eventBusOnSpy.mock.calls.find(
        ([event]) => event === 'USER_AVAILABLE_PRODUCTS_UPDATED'
      )?.[1];

      expect(userProductsUpdatedHandler).toBeInstanceOf(Function);

      const mockUpdatedProducts = { backups: false, antivirus: true } as any;
      userProductsUpdatedHandler?.(mockUpdatedProducts);

      // Both renderers should receive the update
      expect(mockRenderer1.send).toHaveBeenCalledWith(
        'available-user-products-updated',
        mockUpdatedProducts
      );
      expect(mockRenderer2.send).toHaveBeenCalledWith(
        'available-user-products-updated',
        mockUpdatedProducts
      );
    });

    it('should not send to destroyed renderers and clean them up', () => {
      const mockRenderer1 = { 
        send: jest.fn(),
        once: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false)
      };
      const mockRenderer2 = { 
        send: jest.fn(),
        once: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(true) // This one is destroyed
      };
      const mockEvent1 = { sender: mockRenderer1 };
      const mockEvent2 = { sender: mockRenderer2 };
      const mockProducts = { antivirus: true, backups: true };
      const eventBusOnSpy = jest.spyOn(eventBus, 'on');
      jest.spyOn(configStore, 'get').mockReturnValue(mockProducts);

      registerAvailableUserProductsHandlers();
      
      // Subscribe both renderers
      const subscribeHandler = (AvailableUserProductsIPCMain.on as jest.Mock).mock.calls[0][1];
      subscribeHandler(mockEvent1);
      subscribeHandler(mockEvent2);

      // Get the USER_AVAILABLE_PRODUCTS_UPDATED handler
      const userProductsUpdatedHandler = eventBusOnSpy.mock.calls.find(
        ([event]) => event === 'USER_AVAILABLE_PRODUCTS_UPDATED'
      )?.[1];

      const mockUpdatedProducts = { backups: false, antivirus: true } as any;
      userProductsUpdatedHandler?.(mockUpdatedProducts);

      // Only the non-destroyed renderer should receive the update
      expect(mockRenderer1.send).toHaveBeenCalledWith(
        'available-user-products-updated',
        mockUpdatedProducts
      );
      expect(mockRenderer2.send).not.toHaveBeenCalled();
    });

    it('should throw an error if an uncontrolled error happens in subscribe handler', () => {
      jest.spyOn(configStore, 'get').mockImplementation(() => {
        throw new Error('Unexpected Error');
      });
      const mockEvent = { sender: { send: jest.fn() } };

      registerAvailableUserProductsHandlers();
      const handler = (AvailableUserProductsIPCMain.on as jest.Mock).mock
        .calls[0][1];

      expect(() => handler(mockEvent)).toThrow('Unexpected Error');
    });
  });
});
