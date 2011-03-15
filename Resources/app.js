(function() {

    var dz = {
        path: 'sample',
        maxWidth: 1000,
        maxHeight: 1512,
        steps: 4,
        refreshTimeout: 300,
        showGrid: false
    };

    var win = Ti.UI.createWindow({
        backgroundColor: '#fff',
        title: 'Deep Zoom'
    });
    // go ahead and open the window so its width will get calculated
    win.open();

    var maxZoom = 1, minZoom = win.width / dz.maxWidth;

    var scroll = Titanium.UI.createScrollView({
        contentWidth: dz.maxWidth,
        contentHeight: dz.maxHeight,
        top: 0, right: 0, bottom: 0, left: 0,
        showVerticalScrollIndicator: true,
        showHorizontalScrollIndicator: true,
        maxZoomScale: maxZoom,
        minZoomScale: minZoom,
        zoomScale: minZoom
    });

    var currentScale = 1, loadedScale = 0, step = (maxZoom - minZoom) / (dz.steps - 1);

    win.addEventListener('scale', function(evt) {
        currentScale = Math.round((1 / step) * (evt.scale - minZoom) + 1);
        if (currentScale > dz.steps) {
            currentScale = dz.steps;
        }
    });

    // add a utility function for iterating over an image map
    function iterateImageMap(array, callback) {
        if (!array) {
            return;
        }
        for (var i = 0, l = array.length; i < l; i++) {
            if (!array[i]) {
                continue;
            }
            for (var i2 = 0, l2 = array[i].length; i2 < l2; i2++) {
                if (!array[i][i2]) {
                    continue;
                }
                callback(array[i][i2], i, i2);
            }
        }
    }
    function sum(arr){
        for(var i = 0,sum = 0; i < arr.length; sum += arr[i++]);
        return sum;
    }


    var images = {};

    // once a second, check to see if we need to update the displayed images
    function syncScale() {

        // do we need to do anything?
        if (loadedScale == currentScale) {
            setTimeout(syncScale, dz.refreshTimeout);
            return;
        }

        // create new images
        var colWidths = [], rowHeights = [];
        var currentImages = images[currentScale] || [];
        var imagesDir = Ti.Filesystem.getFile(dz.path, currentScale);
        var listing = imagesDir.getDirectoryListing();
        for (var key in listing) {
            var dim = listing[key].split('.')[0].split('_');
            var x = parseInt(dim[0]), y = parseInt(dim[1]);
            currentImages[x] = currentImages[x] || [];
            currentImages[x][y] = Ti.UI.createImageView({
                image: dz.path + '/' + currentScale + '/' + listing[key],
                width: 'auto', height: 'auto',
                canScale: true
            });
            colWidths[x] = currentImages[x][y].width;
            rowHeights[y] = currentImages[x][y].height;
            if (dz.showGrid) {
                currentImages[x][y].borderColor = 'red';
                currentImages[x][y].borderWidth = 2;
                currentImages[x][y].opacity = 0.6;
                currentImages[x][y].add(Ti.UI.createLabel({
                    text: x + ',' + y,
                    font: { fontSize: 100 },
                    shadowOffset: { x: 1, y: 1},
                    shadowColor: '#fff'
                }));
            }
        }
        
        var totalWidth = sum(colWidths), totalHeight = sum(rowHeights);

        // position the new images
        iterateImageMap(currentImages, function(image, x, y) {
            var top = sum(rowHeights.slice(0, y)) / totalHeight * 100,
                    bottom = sum(rowHeights.slice(y+1)) / totalHeight * 100,
                    left = sum(colWidths.slice(0, x)) / totalWidth * 100,
                    right = sum(colWidths.slice(x+1)) / totalWidth * 100;
            image.top = top + '%';
            image.left = left + '%';
            image.width = 100 - left - right + '%';
            image.height = 100 - top - bottom + '%';
            // now put the image into the background so it will stretch properly
            image.backgroundImage = image.image;
            // and clear out the image by setting it to a transparent png
            image.image = 'transparent.png';
            scroll.add(image);
        });
        images[currentScale] = currentImages;

        // remove old images
        if (loadedScale) {
            iterateImageMap(images[loadedScale], function(image) {
                scroll.remove(image);
            });
            images[loadedScale] = [];
        }

        // loop
        loadedScale = currentScale;
        setTimeout(syncScale, dz.refreshTimeout);

    }

    // boot strap
    syncScale();

    win.add(scroll);

})();