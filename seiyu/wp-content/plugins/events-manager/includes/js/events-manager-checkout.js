/**
 * Events Manager checkout shell: sets up every checkout root (.em-checkout) on the page, with its summary toggle and close control, the document the shell is served as when it is framed in an overlay, and the overlay a flow opens it in over the page it came from.
 * A flow such as the booking checkout (booking-checkout.js), or an add-on printing the shell's markup, builds on the functions and events below and needs nothing else from this file:
 * - em_checkout_setup( container ) sets up the roots in a container, such as a root an add-on has just inserted, which the loader's em_checkout_js_loaded event does for the page.
 * - em_checkout_loaded (bubbles, detail.checkout) on a root once it is set up, em_checkout_summary_toggled (bubbles, detail.checkout and detail.open) when its summary is shown or hidden, and em_checkout_close_requested (bubbles, cancelable, detail.checkout and detail.trigger) when its close control is used, which a dialog in the page listens for to close itself.
 * - em_checkout_open_overlay( url, trigger, title ) and em_checkout_close_overlay(), with em_checkout_overlay_opened, em_checkout_overlay_closed and em_checkout_overlay_message (detail.message, whatever the framed document posted with em_checkout_post()) on the document.
 * Strings come from EM.checkout. No jQuery.
 */

// the frame's postMessage source, so the overlay only listens to its own checkout
var em_checkout_message_source = 'em-checkout';

// the overlay open over this page, the control that opened it and the page's elements it made inert
var em_checkout_overlay = null;
var em_checkout_overlay_trigger = null;
var em_checkout_overlay_inert = [];

// popups a form's fields open, which Escape closes rather than the overlay: the date picker, the time list, the phone's country list, EM's modals (such as the signing pad), selectize dropdowns and EM's dropdown menus (such as Add To Calendar's)
var em_checkout_popups = '.flatpickr-calendar.open, .ui-em_timepicker-wrapper, .iti__dropdown-content:not(.iti__hide), .em-modal.active, .selectize-dropdown, [data-tippy-root].em-tooltip-ddm-display';

document.addEventListener('em_checkout_js_loaded', function( e ){
	em_checkout_setup( e.detail.container );
});

/**
 * Sets up each checkout root in a container (or the container itself if it is one) that is not set up yet, marking it ready. A root's own summary toggle and close control are its direct parts, so a shell printed inside another is set up on its own.
 * @param {Document|HTMLElement} container
 */
var em_checkout_setup = function( container ){
	let checkouts = Array.from( container.querySelectorAll('.em-checkout') );
	if( container instanceof HTMLElement && container.matches('.em-checkout') ){
		checkouts.unshift( container );
	}
	checkouts.forEach( function( checkout ){
		if( checkout.classList.contains('ready') ) return;
		checkout.classList.add('ready');
		em_checkout_toggle_summary( checkout, false );
		// a document served for the overlay (html.framed) and framed in it; one framed without being served for it is reloaded by its flow first
		if( em_checkout_is_document( checkout ) && em_checkout_is_framed() && document.documentElement.classList.contains('framed') ){
			em_checkout_setup_frame( checkout );
		}
		checkout.dispatchEvent( new CustomEvent('em_checkout_loaded', {
			bubbles : true,
			detail : { checkout : checkout },
		}) );
	});
};

/**
 * Whether this document is framed by another page of the site, such as the overlay.
 * @return {boolean}
 */
var em_checkout_is_framed = function(){
	try {
		return window.self !== window.top;
	} catch( e ) {
		return true;
	}
};

/**
 * Whether a root is the standalone document's own (templates/templates/checkout.php), rather than a shell printed in a page or inside another shell.
 * @param {HTMLElement} checkout
 * @return {boolean}
 */
var em_checkout_is_document = function( checkout ){
	return document.body.classList.contains('em-checkout-page') && checkout.parentElement === document.body;
};

/**
 * Posts a message to the page framing this document, which its overlay passes on as em_checkout_overlay_message.
 * @param {Object} message with a type, such as ready or close
 */
var em_checkout_post = function( message ){
	if( !em_checkout_is_framed() ) return;
	try {
		window.parent.postMessage( Object.assign( { source : em_checkout_message_source }, message ), window.location.origin );
	} catch( e ) {}
};

var em_checkout_focus = function( el ){
	if( !el ) return;
	try {
		el.focus( { preventScroll : true } );
	} catch( e ) {
		el.focus();
	}
};

var em_checkout_reduced_motion = function(){
	return !!( window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches );
};

/**
 * A URL with or without the argument that serves a checkout document framed in the overlay.
 * @param {string} url
 * @param {boolean} on
 * @return {string}
 */
var em_checkout_with_overlay = function( url, on ){
	try {
		let target = new URL( url, window.location.href );
		if( on ){
			target.searchParams.set( EM.checkout.overlayVar, '1' );
		} else {
			target.searchParams.delete( EM.checkout.overlayVar );
		}
		return target.toString();
	} catch( e ) {
		return url;
	}
};

/* The summary toggle */

/**
 * Shows or hides a root's summary on a phone: whatever its toggle names in aria-controls, such as the shell's aside or the booking form's summary section. Folded, the summary is inert, so nothing in it (such as a discount code field) can be reached by Tab or clicked. On wide screens the summary is always shown.
 * @param {HTMLElement} checkout
 * @param {boolean} open
 * @param {boolean} animate
 */
var em_checkout_toggle_summary = function( checkout, open, animate = false ){
	let toggle = checkout.querySelector(':scope > .em-checkout-summary-toggle');
	let summary = toggle ? document.getElementById( toggle.getAttribute('aria-controls') ) : null;
	if( !summary || !checkout.contains(summary) || !window.matchMedia ) return;
	let was_open = toggle.getAttribute('aria-expanded') === 'true';
	toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
	checkout.classList.toggle('summary-open', open);
	if( open !== was_open ){
		checkout.dispatchEvent( new CustomEvent('em_checkout_summary_toggled', {
			bubbles : true,
			detail : { checkout : checkout, open : open },
		}) );
	}
	if( window.matchMedia('(min-width: 1000px)').matches ){
		summary.style.height = '';
		summary.removeAttribute('aria-hidden');
		summary.removeAttribute('inert');
		return;
	}
	if( open ){
		summary.removeAttribute('aria-hidden');
		summary.removeAttribute('inert');
	} else {
		// focus inside would be lost to the page once the summary is inert, so it goes back to the toggle
		if( summary.contains( document.activeElement ) ){
			em_checkout_focus( toggle );
		}
		summary.setAttribute('aria-hidden', 'true');
		summary.setAttribute('inert', '');
	}
	if( !animate || em_checkout_reduced_motion() ){
		summary.style.height = open ? 'auto' : '0px';
		return;
	}
	summary.style.height = summary.offsetHeight + 'px';
	void summary.offsetHeight;
	summary.style.height = ( open ? summary.scrollHeight : 0 ) + 'px';
	let done = function( e ){
		if( e.target !== summary ) return;
		summary.removeEventListener('transitionend', done);
		if( toggle.getAttribute('aria-expanded') === 'true' ){
			summary.style.height = 'auto';
		}
	};
	summary.addEventListener('transitionend', done);
};

document.addEventListener('click', function( e ){
	let toggle = e.target.closest ? e.target.closest('.em-checkout-summary-toggle') : null;
	let checkout = toggle ? toggle.closest('.em-checkout.ready') : null;
	if( !checkout || toggle.parentElement !== checkout ) return;
	em_checkout_toggle_summary( checkout, toggle.getAttribute('aria-expanded') !== 'true', true );
});

if( window.matchMedia ){
	window.matchMedia('(min-width: 1000px)').addEventListener('change', function(){
		document.querySelectorAll('.em-checkout.ready').forEach( checkout => em_checkout_toggle_summary( checkout, checkout.classList.contains('summary-open') ) );
	});
}

/* Closing */

/**
 * Asks to close a root, with em_checkout_close_requested. Unless a listener prevents it, the standalone document framed in an overlay asks the page to close the overlay; a link otherwise goes where it points, and a button is left to the dialog's own script.
 * @param {HTMLElement} checkout
 * @param {HTMLElement|null} trigger the close control used, or null for the Escape key
 * @return {boolean} whether the shell handled it, so a link should not be followed
 */
var em_checkout_request_close = function( checkout, trigger ){
	let request = new CustomEvent('em_checkout_close_requested', {
		bubbles : true,
		cancelable : true,
		detail : { checkout : checkout, trigger : trigger },
	});
	if( !checkout.dispatchEvent( request ) ) return true;
	if( em_checkout_is_document( checkout ) && em_checkout_is_framed() ){
		em_checkout_post( { type : 'close' } );
		return true;
	}
	return false;
};

document.addEventListener('click', function( e ){
	let close = e.target.closest ? e.target.closest('.em-checkout-close') : null;
	let checkout = close ? close.closest('.em-checkout.ready') : null;
	if( !checkout ) return;
	if( em_checkout_request_close( checkout, close ) ){
		e.preventDefault();
	}
});

/* The standalone document framed in the overlay */

/**
 * In a document framed by the overlay: Escape asks to close, Tab keeps focus inside, and the page is told the checkout is ready.
 * @param {HTMLElement} checkout the document's root
 */
var em_checkout_setup_frame = function( checkout ){
	// whether a popup is open is noted before the key reaches anything, since some close on Escape without preventing it
	let popup_open = false;
	window.addEventListener('keydown', function( e ){
		if( e.key === 'Escape' ){
			popup_open = Array.from( document.querySelectorAll( em_checkout_popups ) ).some( popup => popup.getClientRects().length > 0 );
		}
	}, true);
	document.addEventListener('keydown', function( e ){
		if( e.key !== 'Escape' ) return;
		// EM's dropdown menus have no Escape of their own
		document.querySelectorAll('[data-tippy-root].em-tooltip-ddm-display').forEach( popper => popper._tippy && popper._tippy.hide() );
		if( !e.defaultPrevented && !popup_open ){
			em_checkout_request_close( checkout, null );
		}
	});
	document.addEventListener('keydown', function( e ){
		if( e.key !== 'Tab' ) return;
		let items = em_checkout_focusables( document.body );
		if( !items.length ) return;
		let first = items[0];
		let last = items[ items.length - 1 ];
		let active = em_checkout_radio_stop( document.activeElement );
		if( e.shiftKey && active === first ){
			e.preventDefault();
			em_checkout_focus( last );
		} else if( !e.shiftKey && active === last ){
			e.preventDefault();
			em_checkout_focus( first );
		}
	});
	em_checkout_post( { type : 'ready' } );
};

// a radio group is a single tab stop: its checked radio, or its first one while none is checked
var em_checkout_radio_stop = function( el ){
	if( !el || el.type !== 'radio' || !el.name ) return el;
	let group = Array.from( document.querySelectorAll('input[type="radio"]') ).filter( radio => radio.name === el.name && radio.form === el.form );
	return group.find( radio => radio.checked ) || group[0];
};

var em_checkout_focusables = function( root ){
	return Array.from( root.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])') ).filter( function( el ){
		return em_checkout_radio_stop( el ) === el && !el.closest('[inert]') && ( el.offsetParent !== null || el === document.activeElement );
	});
};

/* The overlay over the page a checkout is opened from */

/**
 * Opens a checkout document in an overlay over this page, framed with the overlay argument, and makes the rest of the page inert until it closes.
 * @param {string} url the checkout document's address
 * @param {HTMLElement} trigger the control that opened it, which gets focus back on closing
 * @param {string} title the overlay's accessible name
 */
var em_checkout_open_overlay = function( url, trigger, title ){
	if( em_checkout_overlay ) return;
	let src;
	try {
		src = new URL( url, window.location.href );
		src.searchParams.set( EM.checkout.overlayVar, '1' );
	} catch( e ) {
		window.location.href = url;
		return;
	}
	em_checkout_overlay_trigger = trigger;
	let overlay = document.createElement('div');
	overlay.className = 'em em-checkout-overlay';
	overlay.setAttribute('role', 'dialog');
	overlay.setAttribute('aria-modal', 'true');
	overlay.setAttribute('aria-label', title);
	let frame = document.createElement('iframe');
	frame.className = 'em-checkout-overlay-frame';
	frame.title = title;
	frame.setAttribute('allow', 'payment');
	frame.src = src.toString();
	let loading = document.createElement('div');
	loading.className = 'em-checkout-overlay-loading';
	loading.setAttribute('role', 'status');
	loading.setAttribute('aria-label', EM.checkout.loading);
	let close = document.createElement('button');
	close.type = 'button';
	close.className = 'em-checkout-overlay-close';
	close.setAttribute('aria-label', EM.checkout.close);
	close.innerHTML = '<span class="em-icon em-icon-close" aria-hidden="true"></span>';
	close.addEventListener('click', em_checkout_close_overlay);
	frame.addEventListener('load', () => overlay.classList.add('loaded') );
	overlay.append( frame, loading, close );
	document.body.appendChild( overlay );
	em_checkout_overlay = overlay;
	em_checkout_overlay_inert = Array.from( document.body.children ).filter( el => el !== overlay && !el.hasAttribute('inert') );
	em_checkout_overlay_inert.forEach( el => el.setAttribute('inert', '') );
	document.documentElement.classList.add('em-checkout-overlay-open');
	window.requestAnimationFrame( function(){
		if( em_checkout_overlay === overlay ){
			overlay.classList.add('active');
		}
	});
	em_checkout_focus( close );
	document.dispatchEvent( new CustomEvent('em_checkout_overlay_opened', {
		detail : { overlay : overlay, url : url, trigger : trigger },
	}) );
};

/**
 * Closes the overlay, gives the page back and returns focus to the control that opened it.
 */
var em_checkout_close_overlay = function(){
	if( !em_checkout_overlay ) return;
	em_checkout_overlay_inert.forEach( el => el.removeAttribute('inert') );
	em_checkout_overlay_inert = [];
	document.documentElement.classList.remove('em-checkout-overlay-open');
	let trigger = em_checkout_overlay_trigger;
	// before the frame goes, since removing a focused frame blurs whatever is focused next in the same task
	em_checkout_focus( trigger );
	em_checkout_overlay.remove();
	em_checkout_overlay = null;
	em_checkout_overlay_trigger = null;
	document.dispatchEvent( new CustomEvent('em_checkout_overlay_closed', {
		detail : { trigger : trigger },
	}) );
};

window.addEventListener('message', function( e ){
	if( !em_checkout_overlay || e.origin !== window.location.origin ) return;
	let frame = em_checkout_overlay.querySelector('iframe');
	let message = e.data;
	if( !frame || e.source !== frame.contentWindow || !message || message.source !== em_checkout_message_source ) return;
	if( message.type === 'ready' ){
		em_checkout_overlay.classList.add('ready');
		// focusing the frame again would blur the control the checkout has already focused inside it
		if( document.activeElement !== frame ){
			em_checkout_focus( frame );
		}
	}
	document.dispatchEvent( new CustomEvent('em_checkout_overlay_message', {
		detail : { message : message },
	}) );
	if( message.type === 'close' ){
		em_checkout_close_overlay();
	}
});

document.addEventListener('keydown', function( e ){
	if( em_checkout_overlay && e.key === 'Escape' ){
		e.preventDefault();
		em_checkout_close_overlay();
	}
});
