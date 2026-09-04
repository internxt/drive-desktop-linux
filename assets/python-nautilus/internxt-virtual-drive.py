import os

import gi
gi.require_version('Nautilus', '4.0')
gi.require_version('Gtk', '4.0')

from gi.repository import Nautilus, GObject, Gtk, Gdk
import requests
import base64
import urllib.parse


SYNC_STATUS_ATTRIBUTE ="SYNC_STATUS"
SYNC_STATUS_ATTRIBUTE_NAME ="Sync Status"
SYNC_STATUS_ONLY_ONLINE="Only online"

VIRTUAL_DRIVE_ROOT_FOLDER_NAME = "Internxt Drive"

status_to_column_status_map = {
  "on_local": "Offline Available",
  "on_remote": "Online Only",
  "downloading": "Downloading",
  "removing": "Removing"
}

status_to_emblem_map = {
   "on_local": "drive-removable-media",
   "on_remote": "weather-overcast",
   "downloading": "appointment-soon",
   "removing": "appointment-soon"
}

base_url = "http://localhost:4567/hydration/"


class InternxtVirtualDrive(GObject.Object, Nautilus.MenuProvider, Nautilus.ColumnProvider,
                      Nautilus.InfoProvider):
    def _window_removed(self, application, window):
        window_id = window.get_id()
        if window_id in self.selected_files:
            del self.selected_files[window_id]

    def __init__(self):
        print('InternxtVirtualDrive Extension loaded')
        self.display = Gdk.Display.get_default()

        self.selected_files = {}

        app = Gtk.Application.get_default()
        app.connect("window-removed", self._window_removed)


        # Represents if is connected to the fuse folder
        self.connected = True


        user_home = os.path.expanduser("~")
        root_folder = os.path.join(user_home, VIRTUAL_DRIVE_ROOT_FOLDER_NAME)
        self.root_folder = root_folder
        self.file_base_dir = f"file://{self.root_folder}"

    def get_file_items(self, *args):
        app = Gtk.Application.get_default()
        window = app.get_active_window()
        files = args[-1]

        self.selected_files[window.get_id()] = files

        return self._create_menu_items(files, "File")

    def get_background_items(self, *args):
        file = args[-1]
        return self._create_menu_items([file], "Background")

    def _file_is_in_virtual_drive(self, file):
        file_path = self._get_file_path(file)
        root_with_sep = self.root_folder + os.sep

        return file_path == self.root_folder or file_path.startswith(root_with_sep)

    def _file_is_virtual_drive(self, file):
        file_path = self._get_file_path(file)
        return file_path == self.root_folder

    def _get_file_path(self, file):
      file_uri = file.get_uri()
      parsed_uri = urllib.parse.urlparse(file_uri)
      return urllib.parse.unquote(parsed_uri.path)

    def _setItemStatus(self, file, status):

      if status is None:
        return

      emblem = status_to_emblem_map[status]

      if emblem == '' or emblem is None:
         return

      file.invalidate_extension_info()
      file.add_emblem(emblem)


    def _get_availability(self, file):
      base64_encoded = self._encode_file_path(file)

      if file.is_directory() :
        url = base_url + 'folders/' + base64_encoded
      else :
        url = base_url + 'files/' + base64_encoded


      response = requests.get(url)

      if (response.status_code == 200):
        data = response.json()

        if data['locallyAvaliable']:
          return 'on_local'
        else:
          return 'on_remote'

      else:
         return None


    def _update_file_status(self, file):

      status = self._get_availability(file)

      # if status is None:
      #    file.invalidate_extension_info()
      #    return

      if status is None:
        return

      self._setItemStatus(file, status)
      self._set_sync_status_column_attribute(file, status)

    def _set_sync_status_column_attribute(self, file, status):

      text = status_to_column_status_map[status]

      file.add_string_attribute(SYNC_STATUS_ATTRIBUTE_NAME, text)

    def _create_menu_items(self, files, group):
        if len(files) != 1:
          return []

        file = files[0]

        if not self._file_is_in_virtual_drive(file):
          return []

        copy_link = Nautilus.MenuItem(
              name="InternxtVirtualDrive::COPY_LINK" + group,
              label="Copy Internxt Link",
          )
        copy_link.connect("activate", self._copy_internxt_link, [file])

        return [copy_link]

    def _encode_file_path(self, file):
      """Encode the drive-relative path for use as a hydration API URL segment.

      Uses base64url rather than standard base64: the encoded value is a single
      URL path segment, and standard base64 emits '/', which would split it in
      two so that no route matches and the request 404s before reaching the
      controller.
      """
      file_path = self._get_file_path(file)
      relative_path = file_path.replace(self.root_folder, '', 1)

      bytes_data = relative_path.encode('utf-8')
      return base64.urlsafe_b64encode(bytes_data).decode('utf-8')


    def _make_locally_available(self, menu, files):
        for file in files:
            self._setItemStatus(file, 'downloading')

            base64_encoded = self._encode_file_path(file)

            if file.is_directory():
              url = base_url + 'folders/' + base64_encoded
            else:
              url = base_url + 'files/' + base64_encoded

            response = requests.post(url)

            print(response.status_code)

            # if (response.status_code == 202):
            #   self._setItemStatus(file, 'on_local')

    def _copy_internxt_link(self, menu, files):
      base64_encoded = self._encode_file_path(files[0])

      url = base_url + 'copy-link/' + base64_encoded

      try:
        response = requests.post(url)

        if response.status_code != 202:
          print(response.status_code)
          print(response.text)
          return

        data = response.json()
        link = data.get('link')

        if not link:
          print('Copy link failed: missing link in response')
          return

        self.display.get_clipboard().set(link)
        print('link copied')
      except Exception as error:
        print('Copy link failed:', error)

    def _make_remote_only(self, menu, files):
        for file in files:
            self._setItemStatus(file, 'removing')

            base64_encoded = self._encode_file_path(file)

            if file.is_directory() :
              url = base_url + 'folders/' + base64_encoded
            else:
              url = base_url + 'files/' + base64_encoded

            print(url)

            response = requests.delete(url)

            print(response.status_code)

            if (response.status_code == 201):
              self._setItemStatus(file, 'on_remote')


    def get_columns(self):
      return (Nautilus.Column(name='InternxtVirtualDrive::sync',
          attribute=SYNC_STATUS_ATTRIBUTE_NAME,
          label=SYNC_STATUS_ATTRIBUTE_NAME,
          description="Sync status"),)

    def update_file_info(self, file):
      if not self._file_is_in_virtual_drive(file):
        return

      if self._file_is_virtual_drive(file):
        return

      # if file.is_directory():
      #   return

      self._update_file_status(file)




