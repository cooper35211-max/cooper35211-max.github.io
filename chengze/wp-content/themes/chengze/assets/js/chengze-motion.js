/**
 * 承澤前台互動（不使用套件）：首頁輪播、數字從 0 數上去、捲動進場。
 * 系統開啟「減少動態效果」時：輪播不自動播放（可以手動切換）、數字直接顯示、不做進場動畫。
 * 沒有 JavaScript 時：輪播只顯示第一張，其他內容照常顯示（隱藏狀態只在本程式加上 class 之後才生效）。
 */
( function () {
	var root = document.documentElement;
	var reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	/* ---------- 1. 輪播（WAI-ARIA Carousel 範式：有暫停鍵、非作用中的張數 inert） ---------- */
	document.querySelectorAll( '.cz-slider' ).forEach( function ( slider ) {
		var slides = Array.prototype.slice.call( slider.querySelectorAll( ':scope > .wp-block-cover' ) );
		if ( slides.length < 2 ) { return; }
		var DELAY = 6000, current = 0, timer = null, playing = ! reduce, hovering = false, focusing = false;
		slider.setAttribute( 'role', 'region' );
		slider.setAttribute( 'aria-roledescription', '輪播' );
		slider.setAttribute( 'aria-label', '承澤主打訊息' );
		var live = document.createElement( 'div' );
		live.className = 'cz-slides';
		live.setAttribute( 'aria-live', 'off' );
		slides.forEach( function ( s, i ) {
			s.setAttribute( 'role', 'group' );
			s.setAttribute( 'aria-roledescription', '張' );
			s.setAttribute( 'aria-label', ( i + 1 ) + ' / ' + slides.length );
			live.appendChild( s );
		} );
		slider.appendChild( live );

		var nav = document.createElement( 'div' );
		nav.className = 'cz-slider__nav';
		var btn = function ( cls, label, html ) {
			var b = document.createElement( 'button' );
			b.type = 'button'; b.className = cls; b.setAttribute( 'aria-label', label ); b.innerHTML = html;
			return b;
		};
		var svg = function ( d ) { return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>'; };
		var pause = btn( 'cz-slider__pause', '', '' );
		var prev = btn( 'cz-slider__prev', '上一張', svg( 'M15 5l-7 7 7 7' ) );
		var next = btn( 'cz-slider__next', '下一張', svg( 'M9 5l7 7-7 7' ) );
		var dots = document.createElement( 'div' );
		dots.className = 'cz-slider__dots';
		var dotBtns = slides.map( function ( s, i ) {
			var d = btn( 'cz-slider__dot', '第 ' + ( i + 1 ) + ' 張', '<span class="cz-slider__bar"></span>' );
			d.addEventListener( 'click', function () { go( i, true ); } );
			dots.appendChild( d );
			return d;
		} );
		nav.appendChild( pause ); nav.appendChild( prev ); nav.appendChild( dots ); nav.appendChild( next );
		slider.appendChild( nav );

		function setPause() {
			// 標籤在「暫停／播放」之間切換，所以不加 aria-pressed（避免報讀成「已按下的播放」）
			// 只有狀態改變時才換圖示：滑鼠按下（focusin）時重畫按鈕內容，按下與放開會落在不同元素上，瀏覽器就不送出 click
			if ( pause.dataset.state !== String( playing ) ) {
				pause.dataset.state = String( playing );
				pause.setAttribute( 'aria-label', playing ? '暫停輪播' : '播放輪播' );
				pause.innerHTML = playing ? svg( 'M8 5v14M16 5v14' ) : svg( 'M7 5l12 7-12 7z' );
			}
			slider.classList.toggle( 'is-playing', playing && ! hovering && ! focusing );
		}
		function go( i, user ) {
			current = ( i + slides.length ) % slides.length;
			slides.forEach( function ( s, n ) {
				var on = n === current;
				s.classList.toggle( 'is-active', on );
				s.toggleAttribute( 'inert', ! on );
				s.setAttribute( 'aria-hidden', on ? 'false' : 'true' );
				if ( on ) {
					var img = s.querySelector( 'img' );
					if ( img && img.loading === 'lazy' ) { img.loading = 'eager'; }
				}
			} );
			dotBtns.forEach( function ( d, n ) {
				if ( n === current ) { d.setAttribute( 'aria-current', 'true' ); } else { d.removeAttribute( 'aria-current' ); }
			} );
			// 圓點上的進度條：每換一張重新開始跑
			slider.style.setProperty( '--cz-delay', DELAY + 'ms' );
			dots.classList.remove( 'is-run' ); void dots.offsetWidth; dots.classList.add( 'is-run' );
			live.setAttribute( 'aria-live', user ? 'polite' : 'off' );
			schedule();
		}
		function schedule() {
			clearTimeout( timer );
			if ( playing && ! hovering && ! focusing ) { timer = setTimeout( function () { go( current + 1, false ); }, DELAY ); }
			setPause();
		}
		pause.addEventListener( 'click', function () { playing = ! playing; schedule(); } );
		prev.addEventListener( 'click', function () { go( current - 1, true ); } );
		next.addEventListener( 'click', function () { go( current + 1, true ); } );
		// 滑鼠只有停在控制列上才暫停：原本整張輪播都會暫停，但大圖佔了大半個畫面，滑鼠放著不動就一直不換（2026-11-15 使用者回報「沒有自動更換」）
		nav.addEventListener( 'mouseenter', function () { hovering = true; schedule(); } );
		nav.addEventListener( 'mouseleave', function () { hovering = false; schedule(); } );
		slider.addEventListener( 'focusin', function () { focusing = true; schedule(); } );
		slider.addEventListener( 'focusout', function ( e ) { if ( ! slider.contains( e.relatedTarget ) ) { focusing = false; schedule(); } } );
		// 手機左右滑動
		var x0 = null;
		live.addEventListener( 'touchstart', function ( e ) { x0 = e.touches[0].clientX; }, { passive: true } );
		live.addEventListener( 'touchend', function ( e ) {
			if ( x0 === null ) { return; }
			var dx = e.changedTouches[0].clientX - x0; x0 = null;
			if ( Math.abs( dx ) > 50 ) { go( current + ( dx < 0 ? 1 : -1 ), true ); }
		}, { passive: true } );
		// 分頁切到背景時不要累積
		document.addEventListener( 'visibilitychange', function () { if ( document.hidden ) { clearTimeout( timer ); } else { schedule(); } } );
		slider.classList.add( 'is-ready' );
		go( 0, false );
	} );

	/* ---------- 2. 數字從 0 數上去 ---------- */
	var counts = document.querySelectorAll( '.cz-count' );
	if ( counts.length && ! reduce && 'IntersectionObserver' in window ) {
		var io = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( en ) {
				if ( ! en.isIntersecting ) { return; }
				io.unobserve( en.target );
				var el = en.target, end = parseInt( el.getAttribute( 'data-end' ), 10 ), t0 = null;
				var step = function ( t ) {
					if ( ! t0 ) { t0 = t; }
					var p = Math.min( ( t - t0 ) / 1400, 1 );
					el.textContent = Math.round( end * ( 1 - Math.pow( 1 - p, 3 ) ) );
					if ( p < 1 ) { requestAnimationFrame( step ); }
				};
				requestAnimationFrame( step );
			} );
		}, { threshold: 0 } ); // 一露出就開始數（數字區塊在首屏下緣，常常只露出一半）
		counts.forEach( function ( el ) {
			var n = parseInt( el.textContent, 10 );
			if ( isNaN( n ) ) { return; }
			el.setAttribute( 'data-end', n );
			el.style.minWidth = String( n ).length + 'ch'; // 數的過程中寬度不變，旁邊的單位不會跳
			el.textContent = '0';
			io.observe( el );
		} );
	}

	/* ---------- 3. 案例頁的產業篩選（依每張卡片上的產業標籤；沒有 JS 時不出現按鈕，顯示全部案例） ---------- */
	document.querySelectorAll( '.cz-caseq' ).forEach( function ( q ) {
		var list = q.querySelector( '.wp-block-post-template' );
		var posts = Array.prototype.slice.call( q.querySelectorAll( '.wp-block-post' ) );
		if ( ! list || posts.length < 2 ) { return; }
		var tagsOf = function ( p ) { return Array.prototype.map.call( p.querySelectorAll( '.wp-block-post-terms a' ), function ( a ) { return a.textContent.trim(); } ); };
		var all = [];
		posts.forEach( function ( p ) { tagsOf( p ).forEach( function ( t ) { if ( all.indexOf( t ) < 0 ) { all.push( t ); } } ); } );
		if ( all.length < 2 ) { return; }
		var bar = document.createElement( 'div' );
		bar.className = 'cz-filter';
		bar.setAttribute( 'role', 'group' );
		bar.setAttribute( 'aria-label', '依產業篩選案例' );
		var count = document.createElement( 'p' );
		count.className = 'cz-filter__count';
		count.setAttribute( 'aria-live', 'polite' );
		var btns = [];
		var apply = function ( tag ) {
			var n = 0;
			posts.forEach( function ( p ) {
				var show = ! tag || tagsOf( p ).indexOf( tag ) > -1;
				p.hidden = ! show;
				if ( show ) { n++; p.classList.add( 'is-in' ); }
			} );
			btns.forEach( function ( b ) { b.setAttribute( 'aria-pressed', String( b.dataset.tag === ( tag || '' ) ) ); } );
			count.textContent = '顯示 ' + n + ' 件案例' + ( tag ? '（' + tag + '）' : '' );
		};
		[ '' ].concat( all ).forEach( function ( t ) {
			var b = document.createElement( 'button' );
			b.type = 'button'; b.dataset.tag = t; b.textContent = t || '全部';
			b.addEventListener( 'click', function () { apply( t ); } );
			bar.appendChild( b ); btns.push( b );
		} );
		list.parentNode.insertBefore( bar, list );
		list.parentNode.insertBefore( count, list );
		apply( '' );
	} );

	/* ---------- 4. 捲動進場（往上浮現；同一排依序延遲） ---------- */
	if ( ! reduce && 'IntersectionObserver' in window ) {
		var items = document.querySelectorAll( '.cz-head, .cz-stat, .cz-card, .cz-ind, .cz-prod, .cz-news .wp-block-column, .wp-block-post, .cz-svc, .cz-svcs__img, .cz-tile, .cz-value, .cz-photo, .cz-tl, .cz-tl__item, .cz-team, .cz-cert, .cz-loc, .cz-step, .cz-aside > *, .cz-table, .cz-postnav' );
		root.classList.add( 'cz-reveal-on' );
		var rio = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( en ) {
				if ( en.isIntersecting ) { en.target.classList.add( 'is-in' ); rio.unobserve( en.target ); }
			} );
		}, { rootMargin: '0px 0px -8% 0px' } );
		items.forEach( function ( el ) {
			var sib = Array.prototype.indexOf.call( el.parentNode.children, el );
			el.style.setProperty( '--cz-i', Math.min( sib, 5 ) );
			el.classList.add( 'cz-reveal' );
			rio.observe( el );
		} );
		// 保險：3 秒後還沒進場的（例如列印、截圖工具直接捲到底）一律顯示
		setTimeout( function () { items.forEach( function ( el ) { if ( el.getBoundingClientRect().top < innerHeight ) { el.classList.add( 'is-in' ); } } ); }, 3000 );
	}
} )();
