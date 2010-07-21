/**
 * Copyright (c) 2008-2010 The Open Source Geospatial Foundation
 * 
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/**
 * @requires GeoExt/widgets/MapPanel.js
 * @include GeoExt/data/PrintProvider.js
 * @include GeoExt/data/PrintPage.js
 */
Ext.namespace("GeoExt");

/** api: (define)
 *  module = GeoExt
 *  class = PrintMapPanel
 */

/** api: (extends)
 * GeoExt/widgets/MapPanel.js
 */

/** api: example
 *  A map with a "Print..." button. If clicked, a dialog containing a
 *  PrintMapPanel will open, with a "Create PDF" button.
 * 
 *  .. code-block:: javascript
 *     
 *      var mapPanel = new GeoExt.MapPanel({
 *          renderTo: "map",
 *          layers: [new OpenLayers.Layer.WMS("Tasmania State Boundaries",
 *              "http://demo.opengeo.org/geoserver/wms",
 *              {layers: "topp:tasmania_state_boundaries"}, {singleTile: true})],
 *          center: [146.56, -41.56],
 *          zoom: 6,
 *          bbar: [{
 *              text: "Print...",
 *              handler: function() {
 *                  var printDialog = new Ext.Window({
 *                      items: [new GeoExt.PrintMapPanel({
 *                          sourceMap: mapPanel,
 *                          printProvider: {
 *                              capabilities: printCapabilities
 *                          }
 *                      })],
 *                      bbar: [{
 *                          text: "Create PDF",
 *                          handler: function() {
 *                              printDialog.items.get(0).print();
 *                          }
 *                      }]
 *                  });
 *                  printDialog.show();
 *              }
 *          }]
 *      });
 */

/** api: constructor
 *  .. class:: PrintMapPanel
 * 
 *  A map panel that controls scale and center of a print page, based the
 *  current view of a source map. This panel will contain the same layers as
 *  the source map, and it will be sized to exactly match the print extent at
 *  the smallest available scale.
 *  
 *  .. note:: The ``zoom``, ``center`` and ``extent`` config options will have
 *      no affect, as they will be determined by the ``sourceMap``.
 */
GeoExt.PrintMapPanel = Ext.extend(GeoExt.MapPanel, {
    
    /** api: config[map]
     *  ``Object`` Optional configuration for the ``OpenLayers.Map`` object
     *  that this PrintMapPanel creates. Useful e.g. to configure a map with a
     *  custom set of controls, or to add a ``preaddlayer`` listener for
     *  filtering out layer types that cannot be printed.
     *  
     *  .. note:: the ``zoomToMaxExtent``, ``zoomIn`` and ``zoomOut`` methods
     *      of the map will be overridden by this PrintMapPanel, and visible
     *      layers will be copied from ``sourceMap``.
     */
    
    /** api: config[sourceMap]
     *  :class:`GeoExt.MapPanel` or ``OpenLayers.Map`` The map that is to be
     *  printed.
     */
    
    /** private: property[sourceMap]
     *  ``OpenLayers.Map``
     */
    sourceMap: null,
    
    /** api: config[printProvider]
     *  :class:`GeoExt.data.PrintProvider` or ``Object`` PrintProvider to use
     *  for printing. If an ``Object`` is provided, a new PrintProvider will
     *  be created and configured with the object.
     */
    
    /** api: property[printProvider]
     *  :class:`GeoExt.data.PrintProvider` PrintProvider for this
     *  PrintMapPanel.
     *  
     *  .. note:: The PrintMapPanel requires the printProvider's capabilities
     *    to be available upon initialization. This means that a PrintMapPanel
     *    configured with an object as ``printProvider`` will only work when
     *    ``capabilities`` is provided in the printProvider's configuration
     *    object. If ``printProvider`` is provided as an instance of
     *    :class:`GeoExt.data.PrintProvider`, the capabilities must be loaded
     *    before PrintMapPanel initialization.
     */
    printProvider: null,
    
    /** api: property[printPage]
     *  :class:`GeoExt.data.PrintPage` PrintPage for this PrintMapPanel.
     *  Read-only.
     */
    printPage: null,
    
    /** api: config[center]
     *  ``OpenLayers.LonLat`` or ``Array(Number)``  A location for the map
     *  center. Do not set, as this will be overridden with the
     *  ``sourceMap`` center.
     */
    center: null,

    /** api: config[zoom]
     *  ``Number``  An initial zoom level for the map. Do not set, as this
     *  will be overridden with a zoom level matching the ``sourceMap``.
     */
    zoom: null,

    /** api: config[extent]
     *  ``OpenLayers.Bounds or Array(Number)``  An initial extent for the map.
     *  Do not set, as this will be overridden with an extent matching the
     *  ``sourceMap`` resolution.
     */
    extent: null,
    
    /** private: property[printResolutions]
     *  ``Array`` The resolutions available for printing
     */
    printResolutions: null,
    
    /**
     * private: method[initComponent]
     * private override
     */
    initComponent: function() {
        if(this.sourceMap instanceof GeoExt.MapPanel) {
            this.sourceMap = this.sourceMap.map;
        }
        if(!(this.printProvider instanceof GeoExt.data.PrintProvider)) {
            this.printProvider = new GeoExt.data.PrintProvider(
                this.printProvider);
        }
        this.printPage = new GeoExt.data.PrintPage({
            printProvider: this.printProvider
        });
        
        this.updatePrintResolutions();
        
        var me = this;
        var center = this.sourceMap.getCenter();
        this.map = Ext.apply(this.map || {}, {
            // override zoomToMaxExtent so it brings us back to the original
            // extent
            zoomToMaxExtent: function() {
                this.setCenter(center, me.getZoomForResolution(
                    me.printResolutions[0]));
            },
            // override zoomIn and zoomOut to make sure that we only zoom to
            // resolutions supported by the print module
            zoomIn: function() {
                this.zoomTo(me.getZoomForResolution(me.printResolutions[
                    Math.min(
                        me.printResolutions.indexOf(this.getResolution()) + 1, 
                        me.printResolutions.length - 1
                    )
                ]));
            },
            zoomOut: function() {
                this.zoomTo(me.getZoomForResolution(me.printResolutions[
                    Math.max(
                        me.printResolutions.indexOf(this.getResolution()) - 1, 0
                    )
                ]));
            }
        });

        this.layers = [];
        var layer;
        Ext.each(this.sourceMap.layers, function(layer) {
            var clone = layer.clone();
            layer.getVisibility() === true && this.layers.push(clone);
        }, this);

        // set an initial size with the same aspect ratio as the print page.
        // This is crucial for the first fitSize call to determine the correct
        // resolution, otherwise we may be one zoom level off.
        var size = this.printProvider.layout.get("size");
        this.width = size.width;
        this.height = size.height;
        
        var extent = this.sourceMap.getExtent();
        var idealResolution = Math.max(
            extent.getWidth()  / this.width,
            extent.getHeight() / this.height
        );
        this.zoom = this.getZoomForResolution(idealResolution);

        this.center = this.sourceMap.getCenter();
        this.extent = null;
        GeoExt.PrintMapPanel.superclass.initComponent.call(this);
        
        this.fitSize();
        this.printProvider.on("layoutchange", this.fitSize, this);
        this.printProvider.on("layoutchange", this.updatePrintResolutions, this);
        this.printPage.on("change", this.fitZoom, this);
        this.map.events.register("moveend", this, this.updatePage);
    },
    
    /** private: method[updatePrintResolutions]
     *  Creates an array of resolutions supported by the print module.
     */
    updatePrintResolutions: function() {
        this.printResolutions = [];
        var units = this.sourceMap.getUnits();
        this.printProvider.scales.each(function(s){
            var res = OpenLayers.Util.getResolutionFromScale(
                s.get("value"), units
            );
            var zoom = this.sourceMap.getZoomForResolution(res)
            this.printResolutions.push(
                this.sourceMap.getResolutionForZoom(zoom)
            );
        }, this);
    },
    
    /** private: method[getZoomForResolution]
     *  :param resolution: ``Number``
     *
     *  Gets a zoom level that gives us a map extent fitting the print page at
     *  the print resolution closest to the provided resolution.
     */
    getZoomForResolution: function(resolution) {
        for (var i=0, len=this.printResolutions.length; i<len; i++) {            
            if (this.printResolutions[i] < resolution) {
                break;
            }
        }
        return this.sourceMap.getZoomForResolution(
            this.printResolutions[Math.max(0, i-1)]
        );
    },
    
    /** private: method[fitSize]
     *  Fits this PrintMapPanel's width and height to the print extent. This
     *  calculation is based on the print extent for the first available scale,
     *  which means that the print view extent is only guaranteed to be
     *  accurate at that scale. The aspect ratio, however, can be taken for
     *  granted at any scale, because it depends on the layout.
     */
    fitSize: function() {
        var extent = this.printPage.calculatePageBounds(
            this.printProvider.scales.getAt(0),
            this.sourceMap.getUnits()
        );
        var resolution = this.printResolutions[0];
        this.setSize(
            extent.getWidth() / resolution,
            extent.getHeight() / resolution
        );
    },
    
    /** private: method[fitZoom]
     *  Fits this PrintMapPanel's zoom to the print scale.
     */
    fitZoom: function() {
        var zoom = this.getZoomForResolution(
            OpenLayers.Util.getResolutionFromScale(
                this.printPage.scale.get("value"),
                this.map.baseLayer.units));
        this._updating = true;
        this.map.getZoom() != zoom && this.map.zoomTo(zoom);
        delete this._updating;
    },
    
    /** private: method[updatePage]
     *  updates the print page to match this PrintMapPanel's center and scale.
     */
    updatePage: function() {
        if(!this._updating) {
            this.printPage.fit(this.map, true);
        }
    },
    
    /** api: method[print]
     *  :param options: ``Object`` options for
     *      the :class:`GeoExt.data.PrintProvider` :: ``print``  method.
     *  
     *  Convenience method for printing the map, without the need to
     *  interact with the printProvider and printPage.
     */
    print: function(options) {
        this.printProvider.print(this.map, [this.printPage], options);
    },
    
    /** private: method[beforeDestroy]
     */
    beforeDestroy: function() {
        this.map.events.unregister("moveend", this, this.updatePage);
        this.printPage.un("change", this.fitZoom, this);
        this.printProvider.un("layoutchange", this.fitSize, this);
        this.printProvider.un("layoutchange", this.updatePrintResolutions, this);
        GeoExt.PrintMapPanel.superclass.beforeDestroy.apply(this, arguments);
    }
});

/** api: xtype = gx_printmappanel */
Ext.reg('gx_printmappanel', GeoExt.PrintMapPanel); 

