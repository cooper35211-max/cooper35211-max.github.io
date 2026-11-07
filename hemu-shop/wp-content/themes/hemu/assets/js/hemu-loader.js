/**
 * 進站與換頁動畫（不使用套件）。
 * - 第一次進站（同一個瀏覽分頁只播一次）：插圖淡入、品牌名逐字出現、細線畫過去，約 1.6 秒後整片往上掀開
 * - 站內換頁：點連結時簾幕由下往上蓋上（0.5 秒）再跳頁；新頁面載入後簾幕往上掀開
 * - 系統設定「減少動態」或沒有 JavaScript 時都不播；CSS 另有 3 秒自動消失的保險，程式出錯也不會卡住
 * 簾幕的 HTML 由 functions.php 在 <body> 最前面輸出（.hemu-loader）。
 */
( function () {
	var root = document.documentElement;
	var loader = document.querySelector( '.hemu-loader' );
	var reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var done = function () {
		root.classList.add( 'hemu-ready' );
		document.dispatchEvent( new CustomEvent( 'hemu:ready' ) );
	};
	if ( ! loader || reduce ) {
		done();
		return;
	}
	var mode = root.classList.contains( 'hemu-loading--intro' ) ? 'intro' : ( root.classList.contains( 'hemu-loading' ) ? 'page' : '' );
	var hidden = false; // 用變數記住，不靠 class：避免保險計時器在使用者點連結之後又把簾幕狀態重設
	var hide = function () {
		if ( hidden ) { return; }
		hidden = true;
		loader.classList.add( 'is-out' );
		done();
		setTimeout( function () {
			root.classList.remove( 'hemu-loading', 'hemu-loading--intro', 'hemu-loading--page' );
			if ( ! loader.classList.contains( 'is-leaving' ) ) { loader.className = 'hemu-loader'; }
		}, 900 );
	};
	if ( mode ) {
		var minTime = mode === 'intro' ? 1300 : 150;
		var start = performance.now();
		var ready = function () { setTimeout( hide, Math.max( 0, minTime - ( performance.now() - start ) ) ); };
		if ( document.readyState === 'complete' ) { ready(); } else { window.addEventListener( 'load', ready, { once: true } ); }
		setTimeout( hide, 2500 ); // 最晚 2.5 秒一定掀開
	} else {
		done();
	}

	// 站內換頁：簾幕由下往上蓋上再跳頁，並留記號讓下一頁顯示掀開的動畫
	document.addEventListener( 'click', function ( e ) {
		var a = e.target.closest( 'a[href]' );
		if ( ! a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ) { return; }
		if ( a.target && a.target !== '_self' ) { return; }
		if ( a.hasAttribute( 'download' ) || a.closest( '.wc-block-mini-cart, .wc-block-components-drawer' ) ) { return; }
		var url = new URL( a.href, location.href );
		if ( url.origin !== location.origin || /^(mailto|tel):/.test( a.href ) ) { return; }
		if ( url.pathname === location.pathname && url.search === location.search && url.hash ) { return; }
		if ( /\/wp-admin\/|add-to-cart=|\.(pdf|zip|jpg|png|webp)$/i.test( url.href ) ) { return; }
		e.preventDefault();
		try { sessionStorage.setItem( 'hemu-nav', '1' ); } catch ( err ) {}
		loader.className = 'hemu-loader is-leaving';
		setTimeout( function () { location.href = url.href; }, 520 );
	} );
	// 從上一頁返回（bfcache）時，簾幕不能停在蓋上的狀態
	window.addEventListener( 'pageshow', function ( e ) {
		if ( e.persisted ) { loader.className = 'hemu-loader'; root.classList.remove( 'hemu-loading', 'hemu-loading--intro', 'hemu-loading--page' ); done(); }
	} );
} )();
