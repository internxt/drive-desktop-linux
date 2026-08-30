import os
import base64
import json
import urllib.parse
import urllib.request

import gi
gi.require_version('Thunarx', '3.0')

from gi.repository import Thunarx, GObject, Gtk, Gdk


VIRTUAL_DRIVE_ROOT_FOLDER_NAME = "Internxt Drive"

base_url = "http://localhost:4567/hydration/"

# Thunar runs as a daemon and a blocked menu handler blocks the whole file
# manager, so every request is bounded. The other helpers use `requests`
# without a timeout; urllib is used here to avoid making python3-requests a
# prerequisite for Thunar users on top of thunarx-python.
REQUEST_TIMEOUT_SECONDS = 5


class InternxtVirtualDrive(GObject.GObject, Thunarx.MenuProvider):
    """Adds "Copy Internxt Link" to the Thunar context menu inside the drive.

    Thunar's extension interface (`libthunarx-3`) offers menu, property-page,
    preferences and renamer providers. It has NO column or info provider, so
    the sync-status column the Nautilus and Nemo extensions register has no
    Thunar equivalent and is deliberately not attempted here.
    """

    def __init__(self):
        user_home = os.path.expanduser("~")
        self.root_folder = os.path.join(user_home, VIRTUAL_DRIVE_ROOT_FOLDER_NAME)

    def _get_file_path(self, file_info):
        parsed_uri = urllib.parse.urlparse(file_info.get_uri())
        return urllib.parse.unquote(parsed_uri.path)

    def _is_inside_root(self, file_path):
        return (file_path == self.root_folder
                or file_path.startswith(self.root_folder + os.sep))

    def _encode_file_path(self, file_info):
        """Encode the drive-relative path for use as a hydration API URL segment.

        Uses base64url rather than standard base64: the encoded value is a
        single URL path segment, and standard base64 emits '/', which would
        split it in two so that no route matches and the request 404s before
        reaching the controller.
        """
        file_path = self._get_file_path(file_info)
        relative_path = file_path.replace(self.root_folder, '', 1)

        bytes_data = relative_path.encode('utf-8')
        return base64.urlsafe_b64encode(bytes_data).decode('utf-8')

    def _copy_to_clipboard(self, value):
        clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default())
        clipboard.set_text(value, -1)
        clipboard.store()

    def _copy_internxt_link(self, menu_item, file_info):
        base64_encoded = self._encode_file_path(file_info)
        url = base_url + 'copy-link/' + base64_encoded

        request = urllib.request.Request(url, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                body = json.loads(response.read().decode('utf-8'))
        except Exception as error:
            print(f'InternxtVirtualDrive: could not copy link: {error}')
            return

        link = body.get('link')
        if link:
            self._copy_to_clipboard(link)

    def get_file_menu_items(self, window, files):
        if len(files) != 1:
            return []

        file_info = files[0]
        if not self._is_inside_root(self._get_file_path(file_info)):
            return []

        item = Thunarx.MenuItem(
            name='InternxtVirtualDrive::COPY_LINK',
            label='Copy Internxt Link',
            tooltip='Copy a shareable Internxt link to this item',
        )
        item.connect('activate', self._copy_internxt_link, file_info)
        return [item]
