import { UilGlobe, UilFolderOpen, UilSetting } from '@iconscout/react-unicons';
import { Menu, Transition } from '@headlessui/react';
import { ReactNode } from 'react';

export default function Header() {
  const syncIssues = true;

  const accountSection = (
    <div>
      <p className="text-xs font-semibold text-neutral-700">
        alvaro@internxt.com
      </p>
      <div className="flex">
        <p className="text-xs text-neutral-500">0,13GB of 2,0GB</p>
        <p className="ml-1 text-xs text-blue-60">Upgrade</p>
      </div>
    </div>
  );

  const dropdown = (
    <Transition
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <Menu.Items className="absolute py-1 right-0 w-32 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <Menu.Item>
          <DropdownItem>
            <span>Preferences</span>
          </DropdownItem>
        </Menu.Item>
        <Menu.Item>
          <DropdownItem>
            <div className="flex items-baseline">
              <p>Sync issues</p>
              {syncIssues && (
                <p className="ml-4 text-red-60 text-xs font-semibold">12</p>
              )}
            </div>
          </DropdownItem>
        </Menu.Item>
        <Menu.Item>
          <DropdownItem>
            <a
              className="block w-full"
              href="https://help.internxt.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support
            </a>
          </DropdownItem>
        </Menu.Item>
        <Menu.Item>
          <DropdownItem onClick={window.electron.logout}>
            <span>Log out</span>
          </DropdownItem>
        </Menu.Item>
        <Menu.Item>
          <DropdownItem
            className="border-t border-t-l-neutral-20"
            onClick={window.electron.quit}
          >
            <span>Quit</span>
          </DropdownItem>
        </Menu.Item>
      </Menu.Items>
    </Transition>
  );

  const itemsSection = (
    <div className="flex items-center text-m-neutral-100">
      <a
        href="https://drive.internxt.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <HeaderItemWrapper>
          <UilGlobe className="h-5 w-5" />
        </HeaderItemWrapper>
      </a>
      <HeaderItemWrapper>
        <UilFolderOpen
          onClick={window.electron.openSyncFolder}
          className="h-5 w-5"
        />
      </HeaderItemWrapper>
      <Menu as="div" className="relative h-7">
        <Menu.Button>
          <SettingsIcon hasIssues={syncIssues} />
        </Menu.Button>
        {dropdown}
      </Menu>
    </div>
  );

  return (
    <div className="flex justify-between items-center p-3 border border-b-l-neutral-30">
      {accountSection}
      {itemsSection}
    </div>
  );
}

function DropdownItem({
  children,
  className,
  onClick,
}: {
  children: JSX.Element;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`cursor-pointer text-sm text-neutral-500 hover:bg-l-neutral-20 active:bg-l-neutral-30 ${className}`}
      style={{ padding: '6px 12px' }}
      role="button"
      tabIndex={0}
      onKeyDown={onClick}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function SettingsIcon({ hasIssues = false }: { hasIssues?: boolean }) {
  return (
    <HeaderItemWrapper>
      <UilSetting className="h-5 w-5" />
      {hasIssues && (
        <div className="bg-red-60 rounded-full h-2 w-2 absolute top-1 right-1" />
      )}
    </HeaderItemWrapper>
  );
}

function HeaderItemWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="p-1 cursor-pointer hover:bg-l-neutral-30 active:bg-l-neutral-40 rounded-lg relative">
      {children}
    </div>
  );
}
