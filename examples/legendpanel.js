/**
 * Copyright (c) 2008-2012 The Open Source Geospatial Foundation
 *
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/** api: example[legendpanel]
 *  Legend Panel
 *  ------------
 *  Display a layer legend in a panel.
 */

Ext.ns('GisArts');

GisArts.WMSLegend = Ext.extend(GeoExt.WMSLegend, {
    onLayerMoveend: function() {
        this.update();
    },
    update: function() {
        var layer = this.layerRecord.getLayer();
        // In some cases, this update function is called on a layer
        // that has just been removed, see ticket #238.
        // The following check bypass the update if map is not set.
        if(!(layer && layer.map)) {
            return;
        }
        GeoExt.WMSLegend.superclass.update.apply(this, arguments);

        var textCmp = this.items.find(function(item){
            return item.isXType('label');
        });
        var found = false;
        this.items.each(function(cmp) {
            if(cmp !== textCmp) {
                found = true;
                cmp.setUrl(this.getLegendUrl());
            }
        }, this);
        if (found === false) {
            this.add({
                xtype: this.itemXType,
                url: this.getLegendUrl()
            });
        }
        this.doLayout();
    },
    getLegendUrl: function() {
        var rec = this.layerRecord;
        var layer = rec.getLayer();
        var url;
        if (layer.map && layer.map.getExtent() !== null) {
            var bounds = layer.map.getExtent();
            bounds = layer.adjustBounds(bounds);
            var imageSize = layer.getImageSize(bounds);
            var newParams = {};
            // WMS 1.3 introduced axis order
            var reverseAxisOrder = layer.reverseAxisOrder();
            newParams.BBOX = layer.encodeBBOX ?
                bounds.toBBOX(null, reverseAxisOrder) :
                bounds.toArray(reverseAxisOrder);
            newParams.WIDTH = imageSize.w;
            newParams.HEIGHT = imageSize.h;
            newParams.REQUEST = 'GetLegendGraphic';
            if (layer.legendLayers) {
                newParams.LAYERS = layer.legendLayers;
            }
            url = layer.getFullRequestString(newParams);
        }
        return url;
    }
});

GisArts.WMSLegend.supports = function(layerRecord) {
    return layerRecord.getLayer() instanceof OpenLayers.Layer.WMS ? 1 : 0;
};

/** api: legendtype = gisarts_wmslegend */
GeoExt.LayerLegend.types["gisarts_wmslegend"] = GisArts.WMSLegend;

Ext.reg('gisarts_wmslegend', GisArts.WMSLegend);

var mapPanel, legendPanel;

Ext.onReady(function() {
    var map = new OpenLayers.Map({projection: "EPSG:28992", maxExtent: new OpenLayers.Bounds(175000, 400000, 194000, 422000), units: 'm', scales: [10000001, 5000001, 2000001, 1500001, 1000001, 750001, 500001, 375001, 250001, 100001, 50001, 25001, 10001, 5001, 2501, 1001, 501, 251, 101, 1], allOverlays: true});
    map.addLayers([
        new OpenLayers.Layer.WMS(
            "BGT",
            "https://www.cgmgis.nl/cgi-bin/mapserv?",
            {layers: ["bgt_buitengebied", "bgt_wegdeel", "bgt_ondersteunendwegdeel", "bgt_weginrichtingselement", "bgt_begroeidterreindeel", "bgt_vegetatieobject", "bgt_functioneelgebied", "bgt_onbegroeidterreindeel", "bgt_waterdeel", "bgt_ondersteunendwaterdeel", "bgt_overbruggingsdeel", "bgt_scheiding", "bgt_overschrijding", "bgt_onbekendmeten", "bgt_data", "bgt_reconstructie"], format: "image/gif", map: "/home/gisarts/apps/gisportalen/cgmgis/map/authenticatie/basis.map"},
            {singleTile: true, legendLayers: ["bgt_reconstructie", "bgt_overbruggingsdeel", "bgt_wegdeel"]})
    ]);
    map.addControl(new OpenLayers.Control.LayerSwitcher());

    mapPanel = new GeoExt.MapPanel({
        region: 'center',
        height: 400,
        width: 600,
        map: map,
        center: new OpenLayers.LonLat(187810.65642, 416570.47872),
        zoom: 14
    });

    legendPanel = new GeoExt.LegendPanel({
        defaults: {
            labelCls: 'mylabel',
            style: 'padding:5px',
            itemXType: 'custom_legendimage'
        },
        preferredTypes: ['gisarts_wmslegend'],
        cls: "legendpanel",
        bodyStyle: 'padding:5px',
        width: 350,
        autoScroll: true,
        region: 'west'
    });

    new Ext.Panel({
        title: "GeoExt LegendPanel Demo",
        layout: 'border',
        renderTo: 'view',
        height: 400,
        width: 800,
        items: [legendPanel, mapPanel]
    });
});

// here we create a customized LegendImage component. Our goal is to add a label
// for each layer.PARAMS.LAYERS' item.
CustomLegendImage = Ext.extend(GeoExt.LegendImage, {
    initComponent: function() {
        CustomLegendImage.superclass.initComponent.call(this);
        this.autoEl = {
            tag: "div",
            children: [{
                tag: 'label',
                html: OpenLayers.i18n(this.itemId)
            },{
                tag: "img",
                "class": (this.imgCls ? this.imgCls + " " + this.noImgCls : this.noImgCls),
                src: this.defaultImgSrc
            }]
        };
    },

    getImgEl: function() {
        return Ext.select('img', false, this.getEl().dom).first();
    }
});
Ext.reg('custom_legendimage', CustomLegendImage);

OpenLayers.Lang.en = {
    'za_vegetation': 'Vegetation',
    'za_natural': 'Natural Landmarks',
    'za_roads': 'Roads'
};
OpenLayers.Lang.setCode('en');
