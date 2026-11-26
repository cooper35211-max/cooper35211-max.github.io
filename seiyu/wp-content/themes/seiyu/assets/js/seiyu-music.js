/**
 * 背景音樂（2026-11-26 使用者要求：預設開啟）。
 * 瀏覽器不允許一打開頁面就自動播放有聲音的音樂，所以「預設開啟」的做法是：
 * 1. 等訪客第一次點擊、觸碰或按鍵再開始（捲動不算，瀏覽器不讓捲動啟動聲音）。
 * 2. 同一個分頁裡換頁時，上一頁正在播放就直接接著播（瀏覽器通常允許已互動過的網站播放；被擋下時一樣等下一次互動）。
 *    一開始就呼叫 play() 會讓瀏覽器立刻下載音檔，所以第一次進站不這樣做。
 * 3. 右下角按鈕隨時可以關掉；訪客的選擇存在 localStorage，下次來照舊（無障礙規範：自動播放的聲音要能停止）。
 * 換頁時從上一頁停下的地方接著播（sessionStorage），分頁切到背景時暫停。
 * 音檔 preload="none"：沒開始播放前完全不下載，不影響頁面載入速度。
 */
( function () {
	var audio = document.getElementById( 'sy-music-audio' );
	var btn = document.getElementById( 'sy-music-btn' );
	if ( ! audio || ! btn ) {
		return;
	}
	var KEY = 'sy-music', POS = 'sy-music-pos', TARGET = 0.35;
	var store = function ( s, k, v ) { try { if ( undefined === v ) { return window[ s ].getItem( k ); } window[ s ].setItem( k, v ); } catch ( e ) { return null; } };
	var wanted = store( 'localStorage', KEY ) !== 'off'; // 預設開啟
	var fadeTimer = null;

	function render( playing ) {
		btn.setAttribute( 'aria-pressed', wanted ? 'true' : 'false' );
		btn.setAttribute( 'aria-label', wanted ? '背景音樂：開啟中，按一下關閉' : '背景音樂：已關閉，按一下播放' );
		btn.classList.toggle( 'is-playing', !! playing );
		btn.classList.toggle( 'is-off', ! wanted );
	}
	function fade( to, done ) {
		clearInterval( fadeTimer );
		fadeTimer = setInterval( function () {
			var v = audio.volume + ( to > audio.volume ? 0.02 : -0.04 );
			if ( ( to > audio.volume && v >= to ) || ( to <= audio.volume && v <= to ) ) {
				audio.volume = Math.max( 0, Math.min( 1, to ) );
				clearInterval( fadeTimer );
				if ( done ) { done(); }
				return;
			}
			audio.volume = Math.max( 0, Math.min( 1, v ) );
		}, 60 );
	}
	function play() {
		if ( ! audio.dataset.loaded ) {
			audio.preload = 'auto';
			var pos = parseFloat( store( 'sessionStorage', POS ) || 0 );
			if ( pos > 0 ) {
				audio.addEventListener( 'loadedmetadata', function () { if ( pos < audio.duration ) { audio.currentTime = pos; } }, { once: true } );
			}
			audio.dataset.loaded = '1';
		}
		audio.volume = 0;
		var p = audio.play();
		if ( p && p.then ) {
			p.then( function () { audio.dataset.started = '1'; render( true ); fade( TARGET ); store( 'sessionStorage', 'sy-music-on', '1' ); } ).catch( function () { render( false ); armGesture(); } );
		} else {
			render( true ); fade( TARGET );
		}
	}
	function pause() {
		store( 'sessionStorage', 'sy-music-on', '0' );
		fade( 0, function () { audio.pause(); } );
		render( false );
	}
	// 等第一次互動再播（只在訪客想聽、還沒播放時）
	var armed = false;
	function onGesture( e ) {
		if ( e.target && e.target.closest && e.target.closest( '#sy-music-btn' ) ) {
			return; // 按的是音樂按鈕本身，交給按鈕處理
		}
		disarm();
		if ( wanted && audio.paused ) {
			play();
		}
	}
	function armGesture() {
		if ( armed ) { return; }
		armed = true;
		[ 'pointerdown', 'keydown', 'touchend' ].forEach( function ( t ) { document.addEventListener( t, onGesture, true ); } );
	}
	function disarm() {
		armed = false;
		[ 'pointerdown', 'keydown', 'touchend' ].forEach( function ( t ) { document.removeEventListener( t, onGesture, true ); } );
	}

	btn.addEventListener( 'click', function () {
		// 預設開啟但還沒開始（瀏覽器在等第一次互動）：第一下按按鈕就是要聽，直接播放，不要變成關閉
		if ( wanted && audio.paused && ! audio.dataset.started ) {
			disarm(); play(); return;
		}
		wanted = ! wanted;
		store( 'localStorage', KEY, wanted ? 'on' : 'off' );
		if ( wanted ) { play(); } else { disarm(); pause(); }
	} );
	addEventListener( 'pagehide', function () { if ( ! audio.paused ) { store( 'sessionStorage', POS, String( audio.currentTime ) ); } } );
	document.addEventListener( 'visibilitychange', function () {
		if ( document.hidden ) {
			if ( ! audio.paused ) { audio.dataset.resume = '1'; audio.pause(); render( false ); }
		} else if ( audio.dataset.resume && wanted ) {
			delete audio.dataset.resume; play();
		}
	} );

	render( false );
	if ( wanted ) {
		if ( store( 'sessionStorage', 'sy-music-on' ) === '1' ) {
			play();
		} else {
			armGesture();
		}
	}
} )();
