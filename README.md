# Internxt Drive Desktop

<p>
  The official desktop application for Internxt Drive. Built with <a href="https://electron.atom.io/">Electron</a>, <a href="https://facebook.github.io/react/">React</a>, <a href="https://github.com/reactjs/react-router">React Router</a>, <a href="https://webpack.js.org/">Webpack</a> and <a href="https://www.npmjs.com/package/react-refresh">React Fast Refresh</a>.
</p>

<br>

## Installation on Linux

Internxt Drive is available for Linux in two formats:

### .deb Package (Recommended)
Download and install the `.deb` package for full compatibility:

```bash
sudo dpkg -i internxt_2.5.1_amd64.deb
```

### AppImage
Alternatively, you can use the AppImage format:

```bash
chmod +x Internxt-2.5.1.AppImage
./Internxt-2.5.1.AppImage
```

**⚠️ Important Note about AppImage and SSO Login:**
Due to technical limitations of the AppImage format, the new SSO login flow is only supported when using Chrome. The .deb version does not have this restriction and remains fully compatible with all browsers.

For the best experience with SSO authentication, we recommend using the .deb package installation method.

## Development

### Install

Clone the repo and install dependencies:

```bash
git clone https://github.com/internxt/drive-desktop-linux.git
cd drive-desktop-linux
yarn install
```

### Starting Development

Start the app in the `dev` environment:

```bash
yarn start
```

## Packaging for Production

To package apps for the local platform:

```bash
yarn package
```

## License

AGPL-3.0

## Credits

This project is built using Electron React Boilerplate, which can be found [here](https://electron-react-boilerplate.js.org).
