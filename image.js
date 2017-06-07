/*
Generically generates an xml element.
This is designed to be used to create elements to add to the svg.
The element is _not_ added to any DOM by this function.

name: Required. Tag name for the new element.
attr: Required. An JS object of attribute values to be added to the element.
id:   Optional. The element's id attribute.

Returns a reference to the element.
*/
function buildEl(name, attrs, id) {
  var el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (var key in attrs) {
    el.setAttribute(key, attrs[key]);
  }

  if (id !== undefined) el.setAttribute('id', id);

  return el;
}

/*
Determines the decade in which a year belongs.
A decade is defined as an integer of all the digits in a year except the one's digit.
For example, the decade for 1945 is 194.

yr: Required. The year.

Returns: The decade containing 'yr'.
*/
function getDecadeForYr(yr) {
  return Math.floor(yr / 10);
}

// "Constants"
var curYr = new Date().getFullYear();
var curDecade = getDecadeForYr(curYr);

var decadeHeight = 30;
var decadeWidth = 60;

/*
Generates the svg xml element tree used to render a decade label.
The element is _not_ added to any DOM by this function.

decadeYr: Required. A year in the decade for which we want a label.

Returns: An svg xml element tree.
*/
function buildDecadeEl(decadeYr) {
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
Adds decade labels to the svg DOM.

Side Effect: Mutates the DOM of the element with id 'decades'.

startYr: The earliest year that needs a decade label.
endYr:   The latest year that needs a decade label.

Returns: Nothing.
*/
function addDecadeEls(startYr, endYr) {
  // Determine the earliest and latest decades
  var startDecade = getDecadeForYr(startYr);
  var endDecade = getDecadeForYr(endYr);

  // Generate all decade labels and add them to the DOM
  var decadesEl = document.getElementById("decades");
  for (var decade = startDecade; decade <= endDecade; decade++) {
    var decadeEl = buildDecadeEl(decade * 10);

    decadesEl.appendChild(decadeEl);
  }

  // Shift all elements up based on the end decade
  var offsetY = (endDecade - curDecade) * decadeHeight;

  var decadeOffsetEl = document.getElementById("decadeOffset");
  decadeOffsetEl.setAttribute("transform", "translate(0, " + offsetY + ")");
}

/*
Adds century boundary markers to the svg DOM.

Side Effect: Mutates the DOM of the element with id 'centuries'.

centuryYr: The year where a century transition occurs.
width:     How wide to draw the century boundary marker.

Returns: Nothing.
*/
function addCenturyEl(centuryYr, width) {
  // Determine the decade where the century transition occurs
  centuryDecade = getDecadeForYr(centuryYr);

  // Figure out the offset from the current decade (top of the image)
  var y = (curDecade - centuryDecade + 1) * decadeHeight;

  // Generate the century boundary marker element
  var pathAttrs = {
    'class': 'centuryBoundary',
    'd': 'M 0 ' + y + ' L ' + width + ' ' + y,
  };
  var pathEl = buildEl('path', pathAttrs);
  var centuriesEl = document.getElementById('centuries');
  centuriesEl.appendChild(pathEl);
}

/*
Generates the svg xml element tree used to render a bar for a historical figure's lifetime.
The element is _not_ added to any DOM by this function.

id:     ID to apply to the element.
name:   The historical figure's name to draw on the bar.
height: Bar height.
color:  Bar background color.
x:      Horizontal offset from the left of the 'figures' region.
y:      Vertical offset from the top of the 'figures' region.

Returns: An svg xml element tree.
*/
function buildBarEl(id, name, height, color, x, y) {
  var width = 30; // TODO: define as constant

  // Generate the "root" element of the bar svg xml
  var figureAttrs = {};
  if (x !== undefined && y !== undefined) {
    figureAttrs['transform'] = "translate(" + x + ", " + y + ")";
  }
  var barEl = buildEl('g', figureAttrs, id);

  // Generate the grouping element used to apply the rotation tranformation
  var halfWidth = width / 2;
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
    'class': 'bar',
    'x': 0, 'y': 0,
    'width': height, 'height': width, // Yes, this looks backwards, but that's because the rotate(90) transform is being applied
    'fill': color
  };
  var rectEl = buildEl('rect', rectAttrs);
  groupingEl.appendChild(rectEl);

  // Generate the text label element
  var textAttrs = {
    'class': 'bar',
    'x': halfHeight, 'y': halfWidth // Yes, this looks backwards, but that's because the rotate(90) transform is being applied
  };
  var textEl = buildEl('text', textAttrs);
  textEl.innerHTML = name;
  groupingEl.appendChild(textEl);

  return barEl;
}

/*
Sets the height of the bar graying out the future.

Side Effect: Mutates the DOM of the element with id 'future'.

Returns: Nothing.
*/
function setFutureHeight() {
  // Determine how many years of height the future area should cover
  var yrsIntoDecade = curYr - (curDecade * 10);
  var yrsLeftInDecade = 10 - yrsIntoDecade;

  // Modify the height of the 'future' element
  var futureEl = document.getElementById("future");
  futureEl.setAttribute("height", yrsLeftInDecade * decadeHeight / 10);
}
