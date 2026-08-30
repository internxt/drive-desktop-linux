import os
import base64
import json
import threading
import urllib.parse
import urllib.request

import gi
gi.require_version('Thunarx', '3.0')

from gi.repository import Thunarx, GObject, GLib, Gtk, Gdk


VIRTUAL_DRIVE_ROOT_FOLDER_NAME = "Internxt Drive"

base_url = "http://localhost:4567/hydration/"

# Thunar runs as a daemon and GObject signal handlers are synchronous, so the
# request runs on a worker thread and never touches the main loop. The timeout
# bounds that thread rather than the UI. urllib is used instead of `requests`
# to avoid making python3-requests a prerequisite on top of thunarx-python.
REQUEST_TIMEOUT_SECONDS = 5


class InternxtVirtualDrive(GObject.GObject, Thunarx.MenuProvider):
    """Adds "Copy Internxt Link" to the Thunar context menu inside the drive.

    Thunar's extension interface (`libthunarx-3`) offers menu, property-page,
    preferences and renamer providers. It has NO column or info provider, so
    the sync-status column the Nautilus and Nemo extensions register has no
    Thunar equivalent and is deliberately not attempted here.
    """

    def __init__(self):
        """Resolve the virtual drive root once, at load time."""
        user_home = os.path.expanduser("~")
        self.root_folder = os.path.join(user_home, VIRTUAL_DRIVE_ROOT_FOLDER_NAME)

    def _get_file_path(self, file_info):
        """The decoded local path behind a `file://` URI."""
        parsed_uri = urllib.parse.urlparse(file_info.get_uri())
        return urllib.parse.unquote(parsed_uri.path)

    def _is_inside_root(self, file_path):
        """Is this path the drive root or something under it?

        Compares against `root + os.sep` rather than the bare prefix, so a
        sibling like "Internxt Drive Backup" is not treated as inside.
        """
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
        """Put `value` on the clipboard. Must run on the GTK main context."""
        clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default())
        clipboard.set_text(value, -1)
        clipboard.store()

    def _copy_to_clipboard_once(self, value):
        """The `idle_add` callback, on the main context.

        Returns SOURCE_REMOVE explicitly. An idle callback that returns a truthy
        value is rescheduled, so an implicit `None` here would work only by
        accident and any later edit returning a value would set the clipboard
        forever.
        """
        self._copy_to_clipboard(value)
        return GLib.SOURCE_REMOVE

    def _request_link(self, url):
        """Ask the local API for a sharing link. Runs on a worker thread."""
        request = urllib.request.Request(url, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                body = json.loads(response.read().decode('utf-8'))
        except Exception as error:
            print(f'InternxtVirtualDrive: could not copy link: {error}')
            return

        link = body.get('link')
        if link:
            # Back to the main context: GTK is not thread-safe and the
            # clipboard must not be touched from this thread.
            GLib.idle_add(self._copy_to_clipboard_once, link)

    def _copy_internxt_link(self, menu_item, file_info):
        """The `activate` handler.

        GObject signal emission is synchronous, so anything slow here stalls
        Thunar's main loop and therefore the whole file manager. The request is
        handed to a daemon thread and this returns immediately.
        """
        base64_encoded = self._encode_file_path(file_info)
        url = base_url + 'copy-link/' + base64_encoded

        worker = threading.Thread(
            target=self._request_link, args=(url,), daemon=True)
        worker.start()

    def get_file_menu_items(self, window, files):
        """Thunarx.MenuProvider: the context-menu items for a selection."""
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
