/**
 * 青嶼茶室前台動態（不使用套件）。
 * 1. 捲動進場：.sy-head、.sy-session、.sy-unveil（照片揭開）。一般是淡入＋往上浮，開了「減少動態效果」只淡入（CSS 決定）。
 *    載入時已經在畫面裡的元素不做進場（承澤的經驗：Lighthouse 會在淡入途中量到半透明顏色，判對比不足）。
 * 2. 標題逐字浮現：.sy-hero__title、.sy-head__title 拆成一個字一個 span（螢幕報讀用 aria-label 念整句）。
 * 3. 視差：[data-sy-px] 依捲動位置上下移動，數值是速度（負數＝比捲動慢）。開了減少動態效果時不做。
 * 沒有 JavaScript 時：隱藏狀態只在本程式加上 html.sy-reveal-on／sy-split-on 後才生效，內容照常顯示。
 */
( function () {
	var root = document.documentElement;
	var calm = matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var inView = function ( el ) { var r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };

	// ---------- 標題逐字 ----------
	function split( el ) {
		var n = 0;
		el.setAttribute( 'aria-label', el.textContent.replace( /\s+/g, '' ) );
		( function walk( node ) {
			Array.prototype.slice.call( node.childNodes ).forEach( function ( c ) {
				if ( c.nodeType === 3 ) {
					var frag = document.createDocumentFragment();
					Array.from( c.textContent ).forEach( function ( ch ) {
						if ( ! ch.trim() ) { frag.appendChild( document.createTextNode( ch ) ); return; }
						var s = document.createElement( 'span' );
						s.className = 'sy-ch'; s.setAttribute( 'aria-hidden', 'true' ); s.style.setProperty( '--ci', n++ ); s.textContent = ch;
						frag.appendChild( s );
					} );
					c.parentNode.replaceChild( frag, c );
				} else if ( c.nodeType === 1 ) { walk( c ); }
			} );
		} )( el );
	}
	var heroTitle = document.querySelector( '.sy-hero__title' );
	var heads = document.querySelectorAll( '.sy-head__title' );
	if ( heroTitle || heads.length ) {
		root.classList.add( 'sy-split-on' );
		if ( heroTitle ) {
			split( heroTitle );
			// 下一個畫格再加 is-in，轉場才會播（延遲由 CSS 的 --sy-d 決定，第一次進站會等載入畫面）
			requestAnimationFrame( function () { requestAnimationFrame( function () { heroTitle.classList.add( 'is-in' ); } ); } );
		}
		Array.prototype.forEach.call( heads, function ( h ) { split( h ); } );
	}

	// ---------- 開課日程：依課程篩選（網址 #first 這類可以直接選好） ----------
	var filter = document.querySelector( '[data-sy-filter]' );
	if ( filter ) {
		var btns = filter.querySelectorAll( '.sy-chip' );
		var count = filter.querySelector( '.sy-filter__count' );
		var apply = function ( cat, announce ) {
			var n = 0;
			btns.forEach( function ( b ) { b.setAttribute( 'aria-pressed', String( b.dataset.cat === cat ) ); } );
			document.querySelectorAll( '[data-sy-month]' ).forEach( function ( m ) {
				var shown = 0;
				m.querySelectorAll( '.sy-session' ).forEach( function ( r ) {
					var ok = ! cat || r.dataset.cat === cat;
					r.hidden = ! ok;
					if ( ok ) { shown++; r.classList.add( 'is-in' ); }
				} );
				m.hidden = ! shown;
				n += shown;
			} );
			if ( announce !== false ) { count.textContent = '共 ' + n + ' 場'; }
		};
		btns.forEach( function ( b ) {
			b.addEventListener( 'click', function () {
				apply( b.dataset.cat );
				history.replaceState( null, '', b.dataset.cat ? '#' + b.dataset.cat : location.pathname );
			} );
		} );
		filter.hidden = false;
		var start = location.hash.slice( 1 );
		if ( start && filter.querySelector( '[data-cat="' + start + '"]' ) ) { apply( start ); } else { apply( '', false ); }
	}

	// ---------- 捲動進場 ----------
	if ( 'IntersectionObserver' in window ) {
		var items = document.querySelectorAll( '.sy-head, .sy-faq__side, .sy-session, .sy-unveil, .sy-reveal-item, .sy-post, .sy-qa, .sy-point, .sy-flowsteps li, .sy-contact li' );
		if ( items.length ) {
			root.classList.add( 'sy-reveal-on' );
			var io = new IntersectionObserver( function ( entries ) {
				entries.forEach( function ( en ) {
					if ( en.isIntersecting ) { en.target.classList.add( 'is-in' ); io.unobserve( en.target ); }
				} );
			}, { rootMargin: '0px 0px -8% 0px' } );
			items.forEach( function ( el ) {
				if ( inView( el ) ) { el.classList.add( 'is-in' ); return; } // 一開始就在畫面裡：直接顯示（標題的字仍會逐字出現）
				var i = Array.prototype.indexOf.call( el.parentNode.children, el );
				el.style.setProperty( '--sy-i', Math.min( i, 5 ) );
				el.classList.add( 'sy-reveal' );
				io.observe( el );
			} );
			// 保險：3 秒後還沒進場、但已經在畫面裡的（例如截圖工具直接捲到底）一律顯示
			setTimeout( function () { items.forEach( function ( el ) { if ( el.getBoundingClientRect().top < innerHeight ) { el.classList.add( 'is-in' ); } } ); }, 3000 );
		}
	} else {
		Array.prototype.forEach.call( document.querySelectorAll( '.sy-head' ), function ( el ) { el.classList.add( 'is-in' ); } );
	}

	// ---------- 視差 ----------
	var px = Array.prototype.slice.call( document.querySelectorAll( '[data-sy-px]' ) );
	if ( calm || ! px.length ) { return; }
	var ticking = false;
	function update() {
		ticking = false;
		px.forEach( function ( el ) {
			var box = el.closest( '[data-sy-px-box]' ) || el.parentElement;
			var r = box.getBoundingClientRect();
			if ( r.bottom < -200 || r.top > innerHeight + 200 ) { return; }
			var max = parseFloat( el.dataset.syPxMax || 9999 );
			var y = ( r.top + r.height / 2 - innerHeight / 2 ) * parseFloat( el.dataset.syPx );
			y = Math.max( -max, Math.min( max, y ) );
			el.style.translate = '0 ' + y.toFixed( 1 ) + 'px';
		} );
	}
	addEventListener( 'scroll', function () { if ( ! ticking ) { ticking = true; requestAnimationFrame( update ); } }, { passive: true } );
	addEventListener( 'resize', update );
	update();
} )();
