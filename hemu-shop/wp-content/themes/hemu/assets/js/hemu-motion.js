/**
 * 捲動進場動畫與文字逐字動畫（不使用套件）。
 * 參考日本網站實測：淡入＋上移、約 1 秒、同一組依序延遲 0.12 秒；照片慢慢淡入並從稍大縮回（等圖片下載完才開始）。
 * 文字：大英文字逐字由下往上滑入（遮罩）；主視覺直排標語、中文小標逐字淡入。
 * - 主視覺等進站動畫結束（hemu:ready）才播
 * - 使用者系統設定「減少動態」時全部略過；沒有 JavaScript 時內容照常顯示
 * - 逐字切開時另外放一份原文給螢幕報讀（.screen-reader-text），切開的字只給視覺用（aria-hidden）
 */
( function () {
	var root = document.documentElement;
	if ( ! ( 'IntersectionObserver' in window ) || window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		root.classList.remove( 'hemu-js' );
		return;
	}

	// ---- 逐字切開 ----
	var split = function ( el, mode ) {
		if ( el.dataset.hemuSplit ) { return; }
		var label = el.textContent.replace( /\s+/g, ' ' ).trim();
		var i = 0;
		var walk = function ( node ) {
			Array.prototype.slice.call( node.childNodes ).forEach( function ( n ) {
				if ( n.nodeType === 3 ) {
					var frag = document.createDocumentFragment();
					// 英文以單字為單位包一層（避免單字被拆到兩行），字母再各自包一層
					n.textContent.split( /(\s+)/ ).forEach( function ( word ) {
						if ( ! word ) { return; }
						if ( /^\s+$/.test( word ) ) { frag.appendChild( document.createTextNode( word ) ); return; }
						var w = document.createElement( 'span' );
						w.className = 'hemu-word';
						Array.from( word ).forEach( function ( ch ) {
							var c = document.createElement( 'span' );
							c.className = 'hemu-char';
							c.textContent = ch;
							c.style.setProperty( '--i', i++ );
							w.appendChild( c );
						} );
						frag.appendChild( w );
					} );
					node.replaceChild( frag, n );
				} else if ( n.nodeType === 1 && n.tagName !== 'BR' ) {
					walk( n );
				}
			} );
		};
		walk( el );
		// 螢幕報讀讀這份完整原文；切開的字只給視覺用（span 不能用 aria-label，Lighthouse 會扣分）
		Array.prototype.forEach.call( el.querySelectorAll( '.hemu-word' ), function ( w ) { w.setAttribute( 'aria-hidden', 'true' ); } );
		var sr = document.createElement( 'span' );
		sr.className = 'screen-reader-text';
		sr.textContent = label;
		el.insertBefore( sr, el.firstChild );
		el.dataset.hemuSplit = mode;
		el.classList.add( 'hemu-split', 'hemu-split--' + mode );
	};
	document.querySelectorAll( '.hemu-en-display' ).forEach( function ( el ) {
		split( el.querySelector( 'span[lang="en"]' ) || el, 'rise' );
	} );
	document.querySelectorAll( '.hemu-hero h1' ).forEach( function ( el ) { split( el, 'fade' ); } );
	document.querySelectorAll( 'main .hemu-indent > h3, main .hemu-stagger h3' ).forEach( function ( el ) { split( el, 'fade' ); } );

	// ---- 區塊進場 ----
	var TEXT = [
		'main .hemu-label', 'main h3', 'main .hemu-more',
		'main .wp-block-columns > .wp-block-column > p', 'main .wp-block-group > p',
		'.hemu-index > a', '.hemu-voice > .wp-block-column',
		'main .wc-block-product-template > li', 'main .wp-block-post-template > li'
	].join( ',' );
	var IMAGES = 'main .wp-block-image:not(.hemu-arch), main .wp-block-cover';
	var mark = function ( el, cls ) {
		if ( el.closest( '.hemu-hero, .hemu-no-reveal' ) || el.classList.contains( 'hemu-split' ) || el.classList.contains( 'hemu-reveal' ) ) {
			return;
		}
		el.classList.add( cls );
		var i = 0, s = el.previousElementSibling;
		while ( s && i < 5 ) {
			if ( s.classList.contains( 'hemu-reveal' ) || s.classList.contains( 'hemu-reveal-img' ) ) { i++; }
			s = s.previousElementSibling;
		}
		el.style.setProperty( '--hemu-delay', ( i * 0.12 ) + 's' );
	};
	document.querySelectorAll( TEXT ).forEach( function ( el ) { mark( el, 'hemu-reveal' ); } );
	document.querySelectorAll( IMAGES ).forEach( function ( el ) { mark( el, 'hemu-reveal-img' ); } );

	// 照片：等圖片下載並解碼完才開始進場（實測慢速網路下，動畫開始時圖片常常還沒到，2 秒後才突然冒出來）
	var whenReady = function ( el, cb ) {
		var imgs = el.tagName === 'IMG' ? [ el ] : Array.prototype.slice.call( el.querySelectorAll( 'img' ) );
		if ( ! imgs.length ) { cb(); return; }
		var called = false, fire = function () { if ( ! called ) { called = true; cb(); } };
		Promise.all( imgs.map( function ( img ) {
			img.loading = 'eager';
			return img.decode ? img.decode().catch( function () {} ) : Promise.resolve();
		} ) ).then( fire );
		setTimeout( fire, 2000 ); // 最多等 2 秒
	};
	var io = new IntersectionObserver( function ( entries ) {
		entries.forEach( function ( e ) {
			if ( ! e.isIntersecting ) { return; }
			var el = e.target;
			io.unobserve( el );
			if ( el.classList.contains( 'hemu-reveal-img' ) || el.classList.contains( 'hemu-band' ) ) {
				whenReady( el, function () { el.classList.add( 'is-in' ); } );
			} else {
				el.classList.add( 'is-in' );
			}
		} );
	}, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 } );
	// 提早下載：照片離畫面還有一個半螢幕遠時，就把延遲載入改成立即下載
	var prefetch = new IntersectionObserver( function ( entries ) {
		entries.forEach( function ( e ) {
			if ( e.isIntersecting ) { e.target.loading = 'eager'; prefetch.unobserve( e.target ); }
		} );
	}, { rootMargin: '150% 0px 150% 0px' } );
	document.querySelectorAll( 'img[loading="lazy"]' ).forEach( function ( img ) { prefetch.observe( img ); } );
	// 其他延遲載入的圖片（商品、文章縮圖）：下載完才淡入，不會突然出現
	document.querySelectorAll( 'main img[loading="lazy"]' ).forEach( function ( img ) {
		if ( img.closest( '.hemu-reveal-img' ) || img.complete ) { return; }
		img.classList.add( 'hemu-fade' );
		img.addEventListener( 'load', function () { img.classList.add( 'is-loaded' ); }, { once: true } );
		img.addEventListener( 'error', function () { img.classList.add( 'is-loaded' ); }, { once: true } );
	} );
	var observe = function () {
		document.querySelectorAll( 'main .hemu-band' ).forEach( function ( el ) { el.classList.add( 'hemu-band--reveal' ); } );
		document.querySelectorAll( '.hemu-reveal, .hemu-reveal-img, .hemu-split, .hemu-band--reveal' ).forEach( function ( el ) {
			if ( el.closest( '.hemu-hero' ) ) { return; }
			io.observe( el );
		} );
	};
	observe();
	// 主視覺：進站動畫掀開後才播
	var heroIn = function () {
		document.querySelectorAll( '.hemu-hero .hemu-split' ).forEach( function ( el ) { el.classList.add( 'is-in' ); } );
		root.classList.add( 'hemu-hero-in' );
	};
	if ( root.classList.contains( 'hemu-ready' ) ) { heroIn(); } else { document.addEventListener( 'hemu:ready', heroIn, { once: true } ); }
	// 沒有進站動畫的頁面（或 loader 被移除）保險：0.3 秒後直接播
	setTimeout( function () { if ( ! root.classList.contains( 'hemu-loading' ) ) { heroIn(); } }, 300 );
} )();
