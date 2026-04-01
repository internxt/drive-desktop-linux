import { Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import PackageJson from '../../../../package.json';
import { TrayMenuState } from './types';

export class TrayMenu {
  private readonly tray: Tray;

  get bounds() {
    return this.tray.getBounds();
  }

  constructor(
    private readonly iconsPath: string,
    private readonly onClick: () => Promise<void>,
    private readonly onQuit: () => void,
  ) {
    const trayIcon = this.getIconPath('LOADING');

    this.tray = new Tray(trayIcon);

    this.setState('LOADING');

    this.tray.setIgnoreDoubleClickEvents(true);

    this.tray.on('click', async () => {
      await this.onClick();
      this.tray.setContextMenu(null);
    });
  }

  getIconPath(state: TrayMenuState) {
    return path.join(this.iconsPath, `${state.toLowerCase()}.png`);
  }

  generateContextMenu() {
    const contextMenuTemplate: Electron.MenuItemConstructorOptions[] = [];
    contextMenuTemplate.push(
      {
        label: 'Show/Hide',
        click: () => {
          this.onClick();
        },
      },
      {
        label: 'Quit',
        click: this.onQuit,
      },
    );

    return Menu.buildFromTemplate(contextMenuTemplate);
  }

  updateContextMenu() {
    const ctxMenu = this.generateContextMenu();
    this.tray.setContextMenu(ctxMenu);
  }

  setState(state: TrayMenuState) {
    const iconPath = this.getIconPath(state);
    this.setImage(iconPath);

    this.setTooltip(state);
  }

  setImage(imagePath: string) {
    const image = nativeImage.createFromPath(imagePath);
    this.tray.setImage(image);
  }

  setTooltip(state: TrayMenuState) {
    const messages: Record<TrayMenuState, string> = {
      SYNCING: 'Sync in process',
      IDLE: `Internxt ${PackageJson.version}`,
      ALERT: 'There are some issues with your sync',
      LOADING: 'Loading Internxt...',
    };

    const message = messages[state];
    this.tray.setToolTip(message);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
    }
  }
}
