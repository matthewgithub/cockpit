/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2013 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

PageNetworking.prototype = {
    _init: function () {
        this.id = "networking";
    },

    getTitle: function() {
        return C_("page-title", "Networking");
    },

    enter: function () {
        this.address = cockpit_get_page_param('machine', 'server') || "localhost";
        this.client = $cockpit.dbus(this.address,
                                    { 'service': "org.freedesktop.NetworkManager",
                                      'object-paths': [ "/org/freedesktop/NetworkManager" ]
                                    });

        this.manager = this.client.get("/org/freedesktop/NetworkManager",
                                       "org.freedesktop.NetworkManager");

        $(this.manager).on("notify:Devices.networking", $.proxy(this, "update_devices"));
        this.update_devices();
    },

    show: function() {
    },

    leave: function() {
        $(this.manager).off(".networking");
        this.client.release();
        this.client = null;
    },

    update_devices: function() {
        var i;
        var devices = this.manager.Devices || [];
        var device, wired, ip4config, ip6config, state_text;
        var table;

        var list = $('#networking_content');

        function toDec(n) {
            return n.toString(10);
        }

        function toHex(n) {
            var x = n.toString(16);
            while (x.length < 2)
                x = '0' + x;
            return x;
        }

        function net32_to_bytes(num) {
            // XXX - endianess
            var bytes = [];
            for (var i = 0; i < 4; i++) {
                bytes[i] = num & 0xFF;
                num = num >>> 8;
            }
            return bytes;
        }

        function render_ip4_address(addr) {
            var num = addr[0];
            var bytes = net32_to_bytes(addr[0]);
            var prefix = addr[1];
            return $('<span>').text(bytes.map(toDec).join('.') + '/' + toDec(addr[1]));
        }

        function render_ip6_address(addr) {
            var bytes = addr[0];
            var prefix = addr[1];
            return $('<span>').text(bytes.map(toHex).join(':') + '/' + toDec(addr[1]));
        }

        list.empty();
        for (i = 0; i < devices.length; i++) {
            device = this.client.lookup(devices[i], "org.freedesktop.NetworkManager.Device");

            // Skip loopback
            if (device.DeviceType == 14)
                continue;

            table = $('<table class="cockpit-info-table">');

            wired = this.client.lookup(devices[i], "org.freedesktop.NetworkManager.Device.Wired");
            if (wired && wired.HwAddress) {
                table.append(
                    $('<tr>').append(
                        $('<td>').text(_("Hardware Address")),
                        $('<td>').text(wired.HwAddress)));
            }

            ip4config = this.client.lookup(device.Ip4Config, "org.freedesktop.NetworkManager.IP4Config");
            if (ip4config && ip4config.Addresses) {
                table.append(ip4config.Addresses.map(function (a) {
                    return $('<tr>').append($('<td>').text(_("IP4 Address")),
                                            $('<td>').html(render_ip4_address(a)));
                }));
            }

            ip6config = this.client.lookup(device.Ip6Config, "org.freedesktop.NetworkManager.IP6Config");
            if (ip6config && ip6config.Addresses) {
                table.append(ip6config.Addresses.map(function (a) {
                    return $('<tr>').append($('<td>').text(_("IP6 Address")),
                                            $('<td>').html(render_ip6_address(a)));
                }));
            }

            state_text = "";
            if (device.State == 100)
                state_text = " - " + _("Up");

            list.append(
                $('<li class="list-group-item">').append(
                    $('<div>').text(device.Interface + state_text),
                    table));
        }
    }

};

function PageNetworking() {
    this._init();
}

cockpit_pages.push(new PageNetworking());
