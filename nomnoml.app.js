var nomnoml = nomnoml || {}

$(function (){

	var storage = null
	var jqCanvas = $('#canvas')
	var viewport = $(window)
	var lineNumbers = $('#linenumbers')
	var lineMarker = $('#linemarker')
	var jqTextarea = $('#textarea')
	var storageStatusElement = $('#storage-status')
	var textarea = document.getElementById('textarea')
	var imgLink = document.getElementById('savebutton')
	var linkLink = document.getElementById('linkbutton')
	var canvasElement = document.getElementById('canvas')
	var canvasPanner = document.getElementById('canvas-panner')
	var defaultSource = document.getElementById('defaultGraph').innerHTML
	var zoomLevel = 0
	var offset = {x:0, y:0}
	var mouseDownPoint = false
	var vm = skanaar.vector

	window.addEventListener('hashchange', reloadStorage);
	window.addEventListener('resize', _.throttle(sourceChanged, 750, {leading: true}))
	textarea.addEventListener('input', _.debounce(sourceChanged, 300))
	canvasPanner.addEventListener('mouseenter', classToggler(jqTextarea, 'hidden', true))
	canvasPanner.addEventListener('mouseleave', classToggler(jqTextarea, 'hidden', false))
	canvasPanner.addEventListener('mousedown', mouseDown)
	window.addEventListener('mousemove', _.throttle(mouseMove,50))
	canvasPanner.addEventListener('mouseup', mouseUp)
	canvasPanner.addEventListener('mouseleave', mouseUp)
	canvasPanner.addEventListener('wheel', _.throttle(magnify, 50))
	initImageDownloadLink(imgLink, canvasElement)
	lineNumbers.val(_.times(60, _.identity).join('\n'))
	initToolbarTooltips()

	reloadStorage()

	function classToggler(jqElement, className, state){
		return _.bind(jqElement.toggleClass, jqElement, className, state)
	}

	function mouseDown(e){
		$(canvasPanner).css({width: '100%'})
		mouseDownPoint = vm.diff({ x: e.pageX, y: e.pageY }, offset)
	}

	function mouseMove(e){
		if (mouseDownPoint){
			offset = vm.diff({ x: e.pageX, y: e.pageY }, mouseDownPoint)
			sourceChanged()
		}
	}

	function mouseUp(){
		mouseDownPoint = false
		$(canvasPanner).css({width: '33%'})
	}

	function magnify(e){
		zoomLevel = Math.min(10, zoomLevel - (e.deltaY < 0 ? -1 : 1))
		sourceChanged()
	}

	nomnoml.toggleSidebar = function (id){
		var sidebars = ['reference', 'about']
		_.each(sidebars, function (key){
			if (id !== key) $(document.getElementById(key)).toggleClass('visible', false)
		})
		$(document.getElementById(id)).toggleClass('visible')
	}

	nomnoml.discardCurrentGraph = function (){
		if (confirm('Do you want to discard current diagram and load the default example?')){
			textarea.value = defaultSource
			sourceChanged()
		}
	}

	nomnoml.saveViewModeToStorage = function (){
		var question = 
			'Do you want to overwrite the diagram in' +
			'localStorage with the currently viewed diagram?'
		if (confirm(question)){
			storage.moveToLocalStorage()
			window.location = './'
		}
	}

	nomnoml.exitViewMode = function (){
		window.location = './'
	}

	// Adapted from http://meyerweb.com/eric/tools/dencoder/
	function urlEncode(unencoded) {
		return encodeURIComponent(unencoded).replace(/'/g,'%27').replace(/"/g,'%22')
	}

	function urlDecode(encoded) {
		return decodeURIComponent(encoded.replace(/\+/g, ' '))
	}

	function setShareableLink(str){
		var base = '#view/'
		linkLink.href = base + urlEncode(str)
	}

	function buildStorage(locationHash){
		var key = 'nomnoml.lastSource'
		if (locationHash.substring(0,6) === '#view/')
			return {
				read: function (){ return urlDecode(locationHash.substring(6)) },
				save: function (){ setShareableLink(textarea.value) },
				moveToLocalStorage: function (){ localStorage[key] = textarea.value },
				isReadonly: true
			}
		return {
			read: function (){ return localStorage[key] || defaultSource },
			save: function (source){
				setShareableLink(textarea.value)
				localStorage[key] = source
			},
			moveToLocalStorage: function (){},
			isReadonly: false
		}
	}

	function initImageDownloadLink(link, canvasElement){
		link.addEventListener('click', downloadImage, false);
		function downloadImage(){
			var url = canvasElement.toDataURL('image/png')
			link.href = url;
		}
	}

	function initToolbarTooltips(){
		var tooltip = $('#tooltip')[0]
		$('.tools > a').each(function (i, link){
			link.onmouseover = function (){ tooltip.textContent  = $(link).attr('title') }
			link.onmouseout = function (){ tooltip.textContent  = '' }
		})
	}

	function positionCanvas(rect, zoom, offset){
		var w = rect.width * zoom
		var h = rect.height * zoom
		jqCanvas.css({
			top: 300 * (1 - h/viewport.height()) + offset.y,
			left: 150 + (viewport.width() - w)/2 + offset.x,
			width: w,
			height: h
		})
	}

	function setFilename(filename){
		imgLink.download = filename + '.png'
	}

	function reloadStorage(){
		storage = buildStorage(location.hash)
		textarea.value = storage.read()
		sourceChanged()
		if (storage.isReadonly) storageStatusElement.show()
		else storageStatusElement.hide()
	}

	function sourceChanged(){
		try {
			lineMarker.css('top', -30)
			lineNumbers.css({background:'#eee8d5', color:'#D4CEBD'})
			var scale = Math.exp(zoomLevel/10)
			var model = nomnoml.draw(canvasElement, textarea.value, scale)
			positionCanvas(canvasElement, model.config.zoom / model.superSampling, offset)
			setFilename(model.config.title)
			storage.save(textarea.value)
		} catch (e){
			var matches = e.message.match('line ([0-9]*)')
			if (matches){
				var lineHeight = parseFloat(jqTextarea.css('line-height'))
				lineMarker.css('top', 8 + lineHeight*matches[1])
			}
			else {
				lineNumbers.css({background:'rgba(220,50,47,0.4)', color:'#657b83'})
				throw e
			}
		}
	}
})
