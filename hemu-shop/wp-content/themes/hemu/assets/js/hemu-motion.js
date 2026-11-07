/**
 * 捲動進場動畫（不使用套件）。
 * 參考日本網站實測：淡入＋上移、約 1 秒、同一組依序延遲 0.12 秒；圖片由下往上揭開。
 * - 主視覺（.hemu-hero）不做，避免拖慢首次顯示
 * - 使用者系統設定「減少動態」時全部略過
 * - 沒有 JavaScript 時內容照常顯示（隱藏樣式只在 html.hemu-js 底下生效）
 */
( function () {
	var root = document.documentElement;
	if ( ! ( 'IntersectionObserver' in window ) || window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		root.classList.remove( 'hemu-js' );
		return;
	}
	var TEXT = [
		'main .hemu-label', 'main h2', 'main h3', 'main .hemu-more', 'main .hemu-en-display',
		'main .wp-block-columns > .wp-block-column > p', 'main .wp-block-group > p',
		'.hemu-index > a', '.hemu-voice > .wp-block-column',
		'main .wc-block-product-template > li', 'main .wp-block-post-template > li'
	].join( ',' );
	var IMAGES = 'main .wp-block-image:not(.hemu-arch), main .wp-block-cover';

	var mark = function ( el, cls ) {
		if ( el.closest( '.hemu-hero, .hemu-no-reveal' ) || el.classList.contains( 'hemu-reveal' ) ) {
			return;
		}
		el.classList.add( cls );
		// 同一個父元素底下的兄弟依序延遲，最多 0.6 秒
		var i = 0, s = el.previousElementSibling;
		while ( s && i < 5 ) {
			if ( s.classList.contains( 'hemu-reveal' ) || s.classList.contains( 'hemu-reveal-img' ) ) {
				i++;
			}
			s = s.previousElementSibling;
		}
		el.style.setProperty( '--hemu-delay', ( i * 0.12 ) + 's' );
	};
	document.querySelectorAll( TEXT ).forEach( function ( el ) { mark( el, 'hemu-reveal' ); } );
	document.querySelectorAll( IMAGES ).forEach( function ( el ) { mark( el, 'hemu-reveal-img' ); } );

	var io = new IntersectionObserver( function ( entries ) {
		entries.forEach( function ( e ) {
			if ( e.isIntersecting ) {
				e.target.classList.add( 'is-in' );
				io.unobserve( e.target );
			}
		} );
	}, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 } );
	document.querySelectorAll( '.hemu-reveal, .hemu-reveal-img' ).forEach( function ( el ) { io.observe( el ); } );
} )();
