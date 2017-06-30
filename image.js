/*
* Determines whether a DOM node is an element (versus text).
* 
* node: Required. The node to check.
* 
* Returns: True iff the node is an element.
*/
function isEl(node) {
  return node.tagName !== undefined;
}

function parseColor(color) {
  var re = /rgb\( *([0-9]*), *([0-9]*), *([0-9]*)\)/
  var reGroups = re.exec(color);

  // TODO: error handling

  var red = parseInt(reGroups[1]);
  var green = parseInt(reGroups[2]);
  var blue = parseInt(reGroups[3]);

  var max = Math.max(red, green, blue);
  var min = Math.min(red, green, blue);

  var lumosity = (max + min) / 2;

  return {
    'red': red, 'r': red,
    'green': green, 'g': green,
    'blue': blue, 'b': blue,
    'lumosity': lumosity, 'l': lumosity
  };
}

/*
* Wraps a possibly-null function in a safe-to-call function
*
* func: Function to wrap. May be null.
*
* Returns: A definitively non-null function.
*/
function wrapCall(func) {
  if (func !== undefined && func !== null) {
    return func;
  } else {
    return function() {};
  }
}

/*
* Clones a DOM node and all its children (recursively) with the
* effective style applied directly to each element.
* Used to generate a DOM tree indpendent of CSS.
*
* node: Required. Root node to clone.
* func: Optional. Function to run against each cloned node for additional customization.
*
* Returns: DOM node tree with styles applied.
*/
function cloneTreeWithStyle(node, func) {
  // Clode the node
  var cloneNode = node.cloneNode(false);

  // Run custom logic
  wrapCall(func)(cloneNode);

  // Clone the computed style info
  if (isEl(node)) {
    // Get the effective style for the element
    var styleInfo = window.getComputedStyle(node, null);

    // Apply the style directly to the cloned element
    for (var propertyIdx = 0; propertyIdx < styleInfo.length; propertyIdx++) {
      var property = styleInfo[propertyIdx];

      // Do *NOT* set style info for attributes set directly on the element
      if (!(property in cloneNode)) {
        cloneNode.style[property] = styleInfo.getPropertyValue(property);
      }
    }
  }

  // Recur
  node.childNodes.forEach(function(child, idx) {
    cloneNode.appendChild(cloneTreeWithStyle(child, func));
  });

  return cloneNode;
}

/*
* Determines the decade in which a year belongs.
* A decade is defined as an integer of all the digits in a year except the one's digit.
* For example, the decade for 1945 is 194.
* 
* yr: Required. The year.
* 
* Returns: The decade containing 'yr'.
*/
getDecadeForYr = function (yr) {
  return Math.floor(yr / 10);
}

// Constants

const curYr = new Date().getFullYear();
const curDecade = getDecadeForYr(curYr);
const indexYr = (curDecade + 1) * 10;

const yrHeight = 3;
const decadeHeight = yrHeight * 10;
const decadeWidth = 60;

const colWidth = 30;

/*
* Generically adds attributes to an element.
* 
* el:   Required. Reference to the element.
* attr: Required. An JS object of attribute values to be added to the element.
* 
* Returns nothing
*/
setAttrs = function (el, attrs) {
  for (var key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
}

/*
* Generically generates an xml element.
* This is designed to be used to create elements to add to the svg.
* The element is _not_ added to any DOM by this function.
* 
* name: Required. Tag name for the new element.
* attr: Required. An JS object of attribute values to be added to the element.
* id:   Optional. The element's id attribute.
* 
* Returns a reference to the element.
*/
buildEl = function (name, attrs, id) {
  var el = document.createElementNS("http://www.w3.org/2000/svg", name);
  setAttrs(el, attrs);

  if (id !== undefined) el.setAttribute('id', id);

  return el;
}

function Bar(image, id, name, startYr, endYr, category, colIdx) {
  this.image = image;
  this.id = id;
  this.colIdx = colIdx;

  const bar = this;

  this.moveToCol = function(colIdx) {
    // Update colIdx
    this.colIdx = colIdx;

    // Update the location
    var x = this.colIdx * colWidth;
    var y = (indexYr - this.effectiveEndYr) * yrHeight;

    this.barGEl.setAttribute('transform', "translate(" + x + ", " + y + ")");
  }

  this.select = function() {
    this.bgRectEl.classList.add('selected-bar');
    this.image.figuresEl.appendChild(this.barGEl);
  }

  this.unselect = function() {
    this.bgRectEl.classList.remove('selected-bar');
  }

  this.update = function (name, startYr, endYr, category) {
    this.name = name;
    this.startYr = startYr;
    this.endYr = endYr;
    this.category = category;

    var cleanCategory = category.replace(/ /g, '_');

    this.image.checkCategories(cleanCategory);

    // Handle an endYr of null representing "still alive"
    if (endYr === undefined || endYr === null) {
      this.effectiveEndYr = curYr;
    } else {
      this.effectiveEndYr = endYr;
    }
  
    // Determine the dimensions and location of the bar
    var x = this.colIdx * colWidth;
    var height = (this.effectiveEndYr - this.startYr) * yrHeight;
    var y = (indexYr - this.effectiveEndYr) * yrHeight;

    var oldCategory = this.barGEl.getAttribute('category');

    var barGAttrs = {
      'startYr': this.startYr, 'endYr': this.endYr,
      'effectiveEndYr': this.effectiveEndYr,
      'colIdx': this.colIdx,
      'category': this.category,
      'transform': "translate(" + x + ", " + y + ")"
    };
    setAttrs(this.barGEl, barGAttrs);
    this.barGEl.classList.add('bar');
    this.barGEl.classList.remove('category-' + oldCategory);
    this.barGEl.classList.add('category-' + cleanCategory);

    var halfWidth = colWidth / 2;
    var halfHeight = height / 2;
    var groupingTransforms = [
      "translate(" + halfWidth + ", " + -halfHeight + ")",
      "rotate(90)",
      "translate(" + halfHeight + ", " + -halfWidth + ")"
    ];
    setAttrs(this.rotateGEl, {'transform': groupingTransforms.join(' ')});

    var bgRectAttrs = {
      'x': 0, 'y': 0,
      'width': height, 'height': colWidth // Yes, this looks backwards, but that's because the rotate(90) transform is being applied
    };
    setAttrs(this.bgRectEl, bgRectAttrs);
    this.bgRectEl.classList.add('bar');
    this.bgRectEl.classList.remove('category-' + oldCategory);
    this.bgRectEl.classList.add('category-' + cleanCategory);
  
    var textAttrs = {
      'class': 'bar category-' + cleanCategory,
      'x': halfHeight, 'y': halfWidth // Yes, this looks backwards, but that's because the rotate(90) transform is being applied
    };
    setAttrs(this.textEl, textAttrs);
    this.textEl.classList.add('bar');
    this.textEl.classList.remove('category-' + oldCategory);
    this.textEl.classList.add('category-' + cleanCategory);

    this.textEl.innerHTML = this.name;

    this.image.assignCols();
  }

  // Generate the "root" grouping element of the bar svg xml
  this.barGEl = buildEl('g', {}, id);

  // Generate the grouping element used to apply the rotation tranformation
  this.rotateGEl = buildEl('g', {});
  this.barGEl.appendChild(this.rotateGEl);

  // Generate the background rectangle element
  this.bgRectEl = buildEl('rect', {});
  this.rotateGEl.appendChild(this.bgRectEl);

  // Add event handling to the background rectangle element
  this.bgRectEl.onclick = function() {
    var image = bar.image;

    var selected = image.getSelectedBar();
    if (selected !== null) {
      // If we've clicked on the selected bar, unselect it
      if (selected == bar) {
        image.selectBar(null);
        return;
      }
    }
    image.selectBar(bar);
  }

  // Generate the text label element
  this.textEl = buildEl('text', {});
  this.rotateGEl.appendChild(this.textEl);

  this.textEl.onclick = this.bgRectEl.onclick;

  this.image.figuresEl.appendChild(this.barGEl);
  this.image.bars.push(this);

  this.update(name, startYr, endYr, category);
}

function Image(width, height, parentEl) {

  // Initialize member variables
  
  this.outerWidth = width;
  this.outerHeight = height;
  this.width = width - 1;
  this.height = height - 1;

  this.bars = [];
  this.selectedBar = null;

  // Methods for labels and other meta content

  /*
  * Generates the svg xml element tree used to render a decade label.
  * The element is _not_ added to any DOM by this function.
  * 
  * decadeYr: Required. A year in the decade for which we want a label.
  * 
  * Returns: An svg xml element tree.
  */
  buildDecadeEl = function (decadeYr) {
    var decade = getDecadeForYr(decadeYr)
  
    // Figure out the offset from the current decade (top of the image)
    var y = (curDecade - decade) * decadeHeight;
  
    // Generate the "root" element of the decade svg xml element tree
    var decadeAttrs = {
      'transform': 'translate(0, ' + y + ')'
    };
    var decadeEl = buildEl('g', decadeAttrs, 'decade' + decadeYr);
  
    // Generate the border rectangle element
    var rectAttrs = {
      'class': 'decadeLabel',
      'x': 0, 'y': 0,
      'width': decadeWidth, 'height': decadeHeight
    };
    var rectEl = buildEl('rect', rectAttrs);
    decadeEl.appendChild(rectEl);
  
    // Generate the text element
    var textAttrs = {
      'class': 'decadeLabel',
      'x': decadeWidth / 2, 'y': decadeHeight / 2
    }
    var textEl = buildEl('text', textAttrs);
    textEl.innerHTML = decadeYr;
    decadeEl.appendChild(textEl);
  
    return decadeEl;
  }

  /*
  * Adds century boundary markers to the svg DOM.
  * 
  * Side Effect: Mutates the DOM of the element with id 'centuries'.
  * 
  * centuryYr: The year where a century transition occurs.
  * width:     How wide to draw the century boundary marker.
  * 
  * Returns: Nothing.
  */
  this.addCenturyEl = function (centuryYr) {
    // Determine the decade where the century transition occurs
    centuryDecade = getDecadeForYr(centuryYr);
  
    // Figure out the offset from the current decade (top of the image)
    var y = (curDecade - centuryDecade + 1) * decadeHeight;
  
    // Generate the century boundary marker element
    var pathAttrs = {
      'class': 'centuryBoundary',
      'd': 'M 0 ' + y + ' L ' + (this.width) + ' ' + y,
    };
    var pathEl = buildEl('path', pathAttrs);
    this.centuriesEl.appendChild(pathEl);
  }

  /*
  * "Scrolls" the image forward or backwards in time
  *
  * Side Effect: Updates the Y-transform of the decadeOffsetEl by "offsetDelta". It will not scroll forwards in time past the end of the current decade.
  *
  * offsetDelta: The relative amount to scroll the image. Negative is backwards in time. Positive is forwards in time.
  *
  * Returns: Nothing.
  */
  this.updateOffset = function (offsetDelta) {
    this.setOffset(parseInt(this.decadeOffsetEl.getAttribute("offset")) + offsetDelta);
  }

  /*
  * "Scrolls" the image to a specific point in time
  *
  * Side Effect: Updates the Y-transform of the decadeOffsetEl to "offset". It will not scroll forwards in time past the end of the current decade.
  *
  * offset: The absolute amount to scroll the image. Negative is backwards in time. Positive is forwards in time.
  *
  * Returns: Nothing.
  */
  this.setOffset = function (offset) {
    // Don't allow scrolling into the future
    if (offset > 0) {
      offset = 0;
    }

    // Update the vertical offset for the whole image
    this.decadeOffsetEl.setAttribute("offset", offset);
    this.decadeOffsetEl.setAttribute("transform", "translate(0, " + offset + ")");

    this.updateDecadeLabels();
  }

  /*
  * Generates new decade labels, as needed
  *
  * Side Effect: Adds new decade labels to the DOM
  *
  * Returns: Nothing.
  */
  this.updateDecadeLabels = function() {
    // Determine the startDecade (aka. the furthest decade back in history that is visible on the image)
    var visibleY = this.height - parseInt(this.decadeOffsetEl.getAttribute('offset'));
    var decadeCount = Math.ceil(visibleY / decadeHeight);
    var endDecade = parseInt(this.decadesEl.getAttribute('end'));
    var startDecade = endDecade - decadeCount + 1;

    // Determine the previous start decade (The furthest decade back in history that already has a label)
    if (this.decadesEl.getAttribute('start') === null) {
      // If no previous start decade is set, we want to generate all decades up to and including the endDecade
      var prevStartDecade = endDecade + 1;
    } else {
      var prevStartDecade = parseInt(this.decadesEl.getAttribute('start'));
    }

    // Generate all decade labels and add them to the DOM
    for (var decade = startDecade; decade < prevStartDecade; decade++) {
      var decadeEl = buildDecadeEl(decade * 10);
  
      this.decadesEl.appendChild(decadeEl);

      if (decade % 10 == 0) {
        this.addCenturyEl(decade * 10);
      }
    }
  }

  /*
  * Adds decade labels to the svg DOM.
  * 
  * Side Effect: Mutates the DOM of the element with id 'decades'.
  * 
  * StartYr: The earliest year that needs a decade label.
  * EndYr:   The latest year that needs a decade label.
  * 
  * Returns: Nothing.
  */
  this.addDecadeEls = function () {
    // Clear existing decades
    var oldDecadesEl = this.decadesEl;
    this.decadesEl = buildEl('g', {'end': curDecade}, 'decades');
    this.decadeOffsetEl.replaceChild(this.decadesEl, oldDecadesEl);

    // Clear existing centuries
    var oldCenturiesEl = this.centuriesEl;
    this.centuriesEl = buildEl('g', {}, 'centuries');
    this.decadeOffsetEl.replaceChild(this.centuriesEl, oldCenturiesEl);

    // Start at the current decade
    this.setOffset(0);

    // Generate visible decade labels
    this.updateDecadeLabels();
  }

  // Methods to manipulate figure bars

  /*
  * Assigns appropriate column indices to each bar element.
  * 
  * Side Effect: Reassigns 'colIdx' and 'transform' attributes on each bar element. Resizes the image to accomodate the number of columns.
  *
  * Returns: Nothing
  */
  this.assignCols = function() {
    this.bars.sort(function(a, b) {
      var endYrDiff = b.effectiveEndYr- a.effectiveEndYr;
      if (endYrDiff == 0) {
        return b.startYr - a.startYr;
      } else {
        return endYrDiff;
      }
    });

    var colsAvailYr = [];
    this.bars.forEach(function(bar, idx) {
      // Find the first column available throught the bar's end year
      firstAvailColIdx = colsAvailYr.findIndex(function(availYr) {
        return availYr >= bar.effectiveEndYr;
      });

      if (firstAvailColIdx == -1) {
        // No column is available for this bar
        // Add a new one
        bar.moveToCol(colsAvailYr.length);
        colsAvailYr.push(bar.startYr);
      } else {
        bar.moveToCol(firstAvailColIdx);
        colsAvailYr[firstAvailColIdx] = bar.startYr;
      }

      var colIdx = bar.colIdx;
      var effectiveEndYr = bar.effectiveEndYr;

      var x = colIdx * colWidth;
      var y = (indexYr - effectiveEndYr) * yrHeight;
    });

	// Resize the image width to fit all of the columns plus a blank column
	this.updateSize(decadeWidth + colWidth * (colsAvailYr.length + 1), this.height);

    // Move the selected bars (if any) to the foreground
    var selected = document.getElementsByClassName('selected-bar');
    for (var idx = 0; idx < selected.length; idx++) {
      var bar = selected[idx];
      var gEl = bar.parentNode.parentNode;
      gEl.parentNode.appendChild(gEl);
    }
  }

  this.getSelectedBar = function() {
    return this.selectedBar;
  }

  this.selectBar = function(bar) {
    if (this.selectedBar !== null) {
      this.selectedBar.unselect();
    }

    if (bar !== null) {
      bar.select();
    }

    this.selectedBar = bar;

    wrapCall(this.onselect)(bar);
  }

  // Default figure background colors to auto-assign
  // TODO: WARNING: This code may be browser-dependent
  // Chrome returns color data from css styles as rgb(r, g, b), but other browsers
  // may format this differently!
  this.categoryBgColors = [
    "rgb(102, 204, 255)",
    "rgb(0, 153, 153)",
    "rgb(0, 0, 153)",
    "rgb(153, 153, 255)",
    "rgb(0, 204, 0)",
    "rgb(102, 255, 204)",
    "rgb(0, 153, 0)",
    "rgb(153, 0, 204)",
    "rgb(255, 0, 255)",
    "rgb(255, 0, 0)",
    "rgb(255, 153, 33)",
    "rgb(255, 255, 0)",
    "rgb(153, 102, 0)"
  ];

  this.checkCategories = function(category) {
    // Clone the categoryBgColors
    var availableBgColors = this.categoryBgColors.slice(0); // Use slice(0) to clone

    // Look through known categories
    for (var ruleIdx = 0; ruleIdx < this.categoryCss.sheet.cssRules.length; ruleIdx++) {
      var rule = this.categoryCss.sheet.cssRules[ruleIdx];

      // If a bg color for this category is already defined, we're done
      if (rule.selectorText == "rect.category-" + category) {
        return;
      }

      // Track which colors are already in use, so we don't reuse them
      if (rule.selectorText.startsWith("rect.category-")) {
        var color = rule.style.fill;
        // Remove the color from availableBgColors, if it's in there
        var colorIdx = availableBgColors.indexOf(color);
        if (colorIdx > -1) {
          availableBgColors.splice(colorIdx, 1);
        }
      }
    }

    // At this point, the category does not have a color defined. Choose the first available color.
    var nextBgColor = availableBgColors[0];
    var colorDetail = parseColor(nextBgColor);
    var nextFgColor = "rgb(0, 0, 0)";
    if (colorDetail['l'] < 128) {
      nextFgColor = "rgb(255, 255, 255)";
    }

    this.categoryCss.appendChild(document.createTextNode("rect.category-" + category + "{fill:" + nextBgColor + "}"));
    this.categoryCss.appendChild(document.createTextNode("text.category-" + category + "{fill:" + nextFgColor + "}"));
  }

  /*
  * Generates the svg xml element tree used to render a bar for a historical figure's lifetime.
  * 
  * id:       ID to apply to the element.
  * name:     The historical figure's name to draw on the bar.
  * startYr:  The year the historical figure was born.
  * endYr:    The year the historical figure died. Use null to represent still alive.
  * category: Category.
  * colIdx:   The column in which the bar should be drawn.
  *
  * Side effect: Adds a tree of svg elements representing a historical figure to the svg DOM.
  * 
  * Returns: An svg xml element tree.
  */
  this.addBar = function(id, name, startYr, endYr, category) {
    var bar = new Bar(this, id, name, startYr, endYr, category, 0);

    return bar;
  }

  // Other "public" methods
  
  /*
  * Generates a url with the image content encoded into it.
  *
  * Returns: A url with the image content encoded into it.
  */
  this.getUrl = function() {
    // Create a clone of the image with styles applied directly to the elements
    var cloneSvgElWithStyle = cloneTreeWithStyle(this.svgEl)

    // Serialize the SVG
    var xmlSerializer = new XMLSerializer();
    var svgContent = xmlSerializer.serializeToString(cloneSvgElWithStyle);
  
    // Construct a URL with serialized content
    var standaloneSvgContent = "<?xml version='1.0' ?>" + svgContent;
    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(standaloneSvgContent);

    return url;
  }

  /*
  * Generates the svg element and the core layout elements.
  *
  * The result should look like:
  *
  *  <svg id="image" xmlns="http://www.w3.org/2000/svg" version="1.1" width="221mm" height="331mm" viewbox="-0.5 -0.5 221 331">
  *    <rect class="bg" x="0" y="0" width="220" height="330" />
  *    <g id="decadeoffset">
  *      <g id="decades" />
  *      <g id="centuries" />
  *      <g id="figureregion" transform="translate(60, 0)">
  *        <g id="figures" />
  *        <rect id="future" class="future" x="0" y="0" width="220" height="0">
  *      </g>
  *    </g>
  *    <rect class="border" x="0" y="0" width="220" height="330" />
  *  </svg>
  *
  * Side Effect: Sets the svgEl property and numerous other class level properties referencing elements in the svg DOM.
  * 
  * Returns: Nothing.
  */
  this.initSvg = function () {
    image = this;

    // Root svg element
    this.svgEl = buildEl("svg", {
      'version': '1.1',
      'width': this.width,
      'height': this.height,
      'viewbox': '-0.5 -0.5 ' + this.outerWidth + ' ' + this.outerHeight
    }, 'image');
    this.svgEl.onwheel = function(wheelEvent) {
      image.updateOffset(wheelEvent['wheelDeltaY']);
    }
  
    // Background rectangle element
    this.bgEl = buildEl('rect', {
      'class': 'bg',
      'x': 0, 'y': 0,
      'width': this.width, 'height': this.height
    }, 'bg');
  
    this.svgEl.appendChild(this.bgEl);
    
    // DecadeOffset grouping element
    this.decadeOffsetEl = buildEl('g', {}, 'decadeOffset');
    this.svgEl.appendChild(this.decadeOffsetEl);
  
    // Decades grouping element
    this.decadesEl = buildEl('g', {}, 'decades');
    this.decadeOffsetEl.appendChild(this.decadesEl);
  
    // Centuries grouping element
    this.centuriesEl = buildEl('g', {}, 'centuries');
    this.decadeOffsetEl.appendChild(this.centuriesEl);
  
    // FigureRegion grouping element
    this.figureRegionEl = buildEl('g', {
      'transform': 'translate(' + decadeWidth + ', 0)'
    }, 'figureRegion');
    this.decadeOffsetEl.appendChild(this.figureRegionEl);
  
    // Figures grouping element
    this.figuresEl = buildEl('g', {}, 'figures');
    this.figureRegionEl.appendChild(this.figuresEl);
  
    // Future rectangle element
    var yrsIntoDecade = curYr - (curDecade * 10);
    var yrsLeftInDecade = 10 - yrsIntoDecade;
  
    this.futureEl = buildEl('rect', {
      'class': 'future',
      'x': 0, 'y': 0,
      'width': width - decadeWidth, 'height': yrsLeftInDecade * decadeHeight / 10
    }, 'future');
    this.figureRegionEl.appendChild(this.futureEl);
  
    // Border rectangle element
    this.borderEl = buildEl('rect', {
      'class': 'border',
      'x': 0, 'y': 0,
      'width': this.width, 'height': this.height
    });
    this.svgEl.appendChild(this.borderEl);
  }

  /*
  * Resizes the image
  *
  * Side Effect: Changes the width and height of the svg and all relevant child tags.
  *
  * width:  New image width
  * height: New image height
  *
  * Returns: nothing.
  */
  this.updateSize = function(width, height) {
    this.outerWidth = width;
    this.outerHeight = height;
    this.width = width - 1;
    this.height = height - 1;
    
    this.svgEl.setAttribute('width', this.width);
    this.svgEl.setAttribute('height', this.height);
    this.svgEl.setAttribute('viewbox', '-0.5 -0.5 ' + this.outerWidth + ' ' + this.outerHeight);
    
    this.bgEl.setAttribute('width', this.width);
    this.bgEl.setAttribute('height', this.height);
    
      var yrsIntoDecade = curYr - (curDecade * 10);
      var yrsLeftInDecade = 10 - yrsIntoDecade;
    
    this.futureEl.setAttribute('width', this.width - decadeWidth);
    this.futureEl.setAttribute('height', yrsLeftInDecade * decadeHeight / 10);
    
    this.borderEl.setAttribute('width', this.width);
    this.borderEl.setAttribute('height', this.height);
  }

  this.initSvg();

  this.addDecadeEls();

  // If parentEl is passed in, automatically add the svg element to it as a child
  if (parentEl !== undefined) {
    parentEl.appendChild(this.svgEl);
  }

  // Set-up style sheet for figure categories

  this.categoryCss = document.createElement('style');
  this.categoryCss.setAttribute('id', 'categoryCss');
  this.categoryCss.type = 'text/css';

  document.getElementsByTagName('head')[0].appendChild(this.categoryCss);
}
