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

/*
* Clones a DOM node and all its children (recursively) with the
* effective style applied directly to each element.
* Used to generate a DOM tree indpendent of CSS.
*
* node: Required. Root node to clone.
*
* Returns: DOM node tree with styles applied.
*/
function cloneTreeWithStyle(node) {
  // Clode the node
  var cloneNode = node.cloneNode(false);

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
    cloneNode.appendChild(cloneTreeWithStyle(child));
  });

  return cloneNode;
}

function Image(width, height, parentEl) {

  // Initialize member variables
  
  this.outerWidth = width;
  this.outerHeight = height;
  this.width = width - 1;
  this.height = height - 1;

  this.barEls = [];

  // Helper methods

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
    for (var key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  
    if (id !== undefined) el.setAttribute('id', id);
  
    return el;
  }

  // Constants

  const curYr = new Date().getFullYear();
  const curDecade = getDecadeForYr(curYr);
  const indexYr = (curDecade + 1) * 10;
  
  const yrHeight = 3;
  const decadeHeight = yrHeight * 10;
  const decadeWidth = 60;

  const colWidth = 30;

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
  * Adds decade labels to the svg DOM.
  * 
  * Side Effect: Mutates the DOM of the element with id 'decades'.
  * 
  * StartYr: The earliest year that needs a decade label.
  * EndYr:   The latest year that needs a decade label.
  * 
  * Returns: Nothing.
  */
  this.addDecadeEls = function (startYr, endYr) {
    // Clear existing decades
    var oldDecadesEl = this.decadesEl;
    this.decadesEl = buildEl('g', {}, 'decades');
    this.decadeOffsetEl.replaceChild(this.decadesEl, oldDecadesEl);

    // Clear existing centuries
    var oldCenturiesEl = this.centuriesEl;
    this.centuriesEl = buildEl('g', {}, 'centuries');
    this.decadeOffsetEl.replaceChild(this.centuriesEl, oldCenturiesEl);

    // Determine the earliest and latest decades
    var startDecade = getDecadeForYr(startYr);
    var endDecade = getDecadeForYr(endYr);
  
    // Generate all decade labels and add them to the DOM
    for (var decade = startDecade; decade <= endDecade; decade++) {
      var decadeEl = buildDecadeEl(decade * 10);
  
      this.decadesEl.appendChild(decadeEl);

      if (decade % 10 == 0) {
        this.addCenturyEl(decade * 10);
      }
    }
  
    // Shift all elements up based on the end decade
    var offsetY = (endDecade - curDecade) * decadeHeight;
  
    this.decadeOffsetEl.setAttribute("transform", "translate(0, " + offsetY + ")");
  }

  // Methods to manipulate figure bars
  
  updatePosition = function(barEl) {
  }

  /*
  * Assigns appropriate column indices to each bar element.
  * 
  * Side Effect: Reassigns 'colIdx' and 'transform' attributes on each bar element.
  *
  * Returns: Nothing
  */
  this.assignCols = function() {
    this.barEls.sort(function(a, b) {
      var endYrDiff = b.getAttribute('effectiveEndYr') - a.getAttribute('effectiveEndYr');
      if (endYrDiff == 0) {
        return b.getAttribute('startYr') - a.getAttribute('startYr');
      } else {
        return endYrDiff;
      }
    });

    var colsAvailYr = [];
    this.barEls.forEach(function(barEl, idx) {
      // Find the first column available throught the bar's end year
      firstAvailColIdx = colsAvailYr.findIndex(function(availYr) {
        return availYr >= barEl.getAttribute('effectiveEndYr');
      });

      if (firstAvailColIdx == -1) {
        // No column is available for this bar
        // Add a new one
        barEl.setAttribute('colIdx', colsAvailYr.length);
        colsAvailYr.push(barEl.getAttribute('startYr'));
      } else {
        barEl.setAttribute('colIdx', firstAvailColIdx);
        colsAvailYr[firstAvailColIdx] = barEl.getAttribute('startYr');
      }

      var colIdx = parseInt(barEl.getAttribute('colIdx'));
      var effectiveEndYr = parseInt(barEl.getAttribute('effectiveEndYr'));

      var x = colIdx * colWidth;
      var y = (indexYr - effectiveEndYr) * yrHeight;

      var transform = "translate(" + x + ", " + y + ")";
      barEl.setAttribute('transform', transform);
    });
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

    this.categoryCss.appendChild(document.createTextNode("rect.category-" + category + "{fill:" + nextBgColor + "}"));
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
  this.addBarEl = function(id, name, startYr, endYr, category, colIdx) {
    this.checkCategories(category);

    // Handle an endYr of null representing "still alive"
    if (endYr === undefined || endYr === null) {
      effectiveEndYr = curYr;
    } else {
      effectiveEndYr = endYr;
    }

    // Determine the dimensions and location of the bar
    var x = colIdx * colWidth;
    var height = (effectiveEndYr - startYr) * yrHeight;
    var y = (indexYr - effectiveEndYr) * yrHeight;

    // Generate the "root" element of the bar svg xml
    var figureAttrs = {
      'class': 'bar category-' + category,
      'startYr': startYr, 'endYr': endYr,
      'effectiveEndYr': effectiveEndYr,
      'colIdx': colIdx,
      'category': category
    };
    if (x !== undefined && y !== undefined) {
      figureAttrs['transform'] = "translate(" + x + ", " + y + ")";
    }
    var barEl = buildEl('g', figureAttrs, id);
    this.barEls.push(barEl);
  
    // Generate the grouping element used to apply the rotation tranformation
    var halfWidth = colWidth / 2;
    var halfHeight = height / 2;
    var groupingTransforms = [
      "translate(" + halfWidth + ", " + -halfHeight + ")",
      "rotate(90)",
      "translate(" + halfHeight + ", " + -halfWidth + ")"
    ];
  
    var groupingEl = buildEl('g', {'transform': groupingTransforms.join(" ")});
    barEl.appendChild(groupingEl);
  
    // Generate the background rectangle element
    var rectAttrs = {
      'class': 'bar category-' + category,
      'x': 0, 'y': 0,
      'width': height, 'height': colWidth // Yes, this looks backwards, but that's because the rotate(90) transform is being applied
    };
    var rectEl = buildEl('rect', rectAttrs);
    groupingEl.appendChild(rectEl);
  
    // Generate the text label element
    var textAttrs = {
      'class': 'bar category-' + category,
      'x': halfHeight, 'y': halfWidth // Yes, this looks backwards, but that's because the rotate(90) transform is being applied
    };
    var textEl = buildEl('text', textAttrs);
    textEl.innerHTML = name;
    groupingEl.appendChild(textEl);

    this.figuresEl.appendChild(barEl);

    this.assignCols();
  
    return barEl;
  }

  // Other "public" methods
  
  /*
  * Generates a url with the image content encoded into it.
  *
  * Returns: A url with the image content encoded into it.
  */
  this.getUrl = function() {
    // Create a clone of the image with styles applied directly to the elements
    var cloneSvgElWithStyle = cloneTreeWithStyle(this.svgEl);

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
    // Root svg element
    this.svgEl = buildEl("svg", {
      'version': '1.1',
      'width': width,
      'height': height,
      'viewbox': '-0.5 -0.5 ' + this.outerWidth + ' ' + this.outerHeight
    }, 'image');
  
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
      'width': width, 'height': height
    });
    this.svgEl.appendChild(this.borderEl);
  }

  this.initSvg();

  this.addDecadeEls(1888, curYr);

  // If parentEl is passed in, automatically add the svg element to it as a child
  if (parentEl !== undefined) {
    parentEl.appendChild(this.svgEl);
  }

  // Set-up style sheet for figure categories

  this.categoryCss = document.createElement('style');
  this.categoryCss.setAttribute('id', 'categoryCss');
  this.categoryCss.type = 'text/css';

  //this.categoryCss.appendChild(document.createTextNode("rect.category-lightblue{fill:red}"));

  document.getElementsByTagName('head')[0].appendChild(this.categoryCss);
}
