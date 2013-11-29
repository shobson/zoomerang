var Zoomer = (function () {

    // elements
    var overlay = makeDiv(),
        wrapper = makeDiv(),
        inner   = makeDiv(),
        target,
        parent,
        placeholder

    // state
    var shown = false,
        lock  = false,
        originalStyles

    // options
    var options = {
        transitionDuration: '.4s',
        transitionTimingFunction: 'cubic-bezier(.4,0,0,1)',
        bgColor: '#fff',
        bgOpacity: 1,
        maxWidth: 300,
        maxHeight: 300
    }

    // transition property
    var trans = sniffTransition(),
        transitionProp = trans.transition,
        transformProp  = trans.transform,
        transEndEvent  = trans.transEnd

    setStyle(overlay, {
        position: 'fixed',
        display: 'none',
        zIndex: 99999,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    })

    setStyle(inner, {
        position: 'absolute',
        zIndex: 0,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        backgroundColor: options.bgColor,
        transition: 'opacity ' +
            options.transitionDuration + ' ' +
            options.transitionTimingFunction
    })

    setStyle(wrapper, {
        position: 'absolute',
        zIndex: 1,
        top: '50%',
        left: '50%'
    })

    overlay.appendChild(inner)
    overlay.appendChild(wrapper)
    document.body.appendChild(overlay)

    // helpers ----------------------------------------------------------------

    function makeDiv () {
        return document.createElement('div')
    }

    function setStyle (el, styles, remember) {
        checkTrans(styles)
        var s = el.style,
            original = {}
        for (var key in styles) {
            if (remember) {
                original[key] = s[key] || ''
            }
            s[key] = styles[key]
        }
        return original
    }

    function sniffTransition () {
        var ret   = {},
            trans = ['transition', 'webkitTransition', 'mozTransition'],
            tform = ['transform', 'webkitTransform', 'mozTransform'],
            end   = {
                'transition'       : 'transitionend',
                'MozTransition'    : 'transitionend',
                'WebkitTransition' : 'webkitTransitionEnd'
            }
        trans.some(function (prop) {
            if (overlay.style[prop] !== undefined) {
                ret.transition = prop
                ret.transEnd = end[prop]
                return true
            }
        })
        tform.some(function (prop) {
            if (overlay.style[prop] !== undefined) {
                ret.transform = prop
                return true
            }  
        })
        return ret
    }

    function checkTrans (styles) {
        if (styles.transition) {
            styles[transitionProp] = styles.transition
        }
        if (styles.transform) {
            styles[transformProp] = styles.transform
        }
    }

    var stylesToCopy = [
        'position', 'float', 'margin', 'display',
        'top', 'left', 'right', 'bottom',
        'lineHeight', 'verticalAlign', 'font'
    ]

    function copy (el, box) {
        var styles = getComputedStyle(el),
            ph = document.createElement('div'),
            i = stylesToCopy.length, key
        while (i--) {
            key = stylesToCopy[i]
            ph.style[key] = styles[key]
        }
        setStyle(ph, {
            visibility: 'hidden',
            width: box.width + 'px',
            height: box.height + 'px',
            display: styles.display === 'inline'
                ? 'inline-block'
                : styles.display
        })
        if (options.deepCopy) {
            ph.innerHTML = el.innerHTML
        } else {
            ph.textContent = el.textContent
        }
        return ph
    }

    var api = {

        config: function (opts) {
            if (!opts) return options
            for (var key in opts) {
                options[key] = opts[key]
            }
            setStyle(inner, {
                backgroundColor: options.bgColor,
                transition: 'opacity ' +
                    options.transitionDuration + ' ' +
                    options.transitionTimingFunction
            })
            return this
        },

        open: function (el) {

            if (lock || shown) return

            target = typeof el === 'string'
                ? document.querySelector(el)
                : el

            shown = true
            parent = target.parentNode

            var p     = target.getBoundingClientRect(),
                scale = Math.min(options.maxWidth / p.width, options.maxHeight / p.height),
                dx    = p.left - (window.innerWidth - p.width) / 2,
                dy    = p.top - (window.innerHeight - p.height) / 2

            placeholder = copy(target, p)
            if (target.nextSibling) {
                parent.insertBefore(placeholder, target.nextSibling)
            } else {
                parent.appendChild(placeholder)
            }

            originalStyles = setStyle(target, {
                position: 'absolute',
                top: 0,
                left: 0,
                whiteSpace: 'nowrap',
                marginTop: -p.height / 2 + 'px',
                marginLeft: -p.width / 2 + 'px',
                transform: 'translate(' + dx + 'px, ' + dy + 'px)',
                transition:
                    transformProp.replace(/(.*)Transform/, '-$1-transform') + ' ' +
                    options.transitionDuration + ' ' +
                    options.transitionTimingFunction
            }, true)

            wrapper.appendChild(target)
            overlay.style.display = 'block'

            // force layout
            var force = target.offsetHeight
            inner.style.opacity = options.bgOpacity
            setStyle(target, {
                transform: 'scale(' + scale + ')'
            })
            return this
        },

        close: function () {
            if (!shown) return
            lock = true
            var p  = placeholder.getBoundingClientRect(),
                dx = p.left - (window.innerWidth - p.width) / 2,
                dy = p.top - (window.innerHeight - p.height) / 2
            setStyle(target, {
                transform: 'translate(' + dx + 'px, ' + dy + 'px)'
            })
            inner.style.opacity = 0
            target.addEventListener(transEndEvent, onEnd)
            function onEnd () {
                target.removeEventListener(transEndEvent, onEnd)
                setStyle(target, originalStyles)
                parent.insertBefore(target, placeholder)
                parent.removeChild(placeholder)
                overlay.style.display = 'none'
                shown = false
                lock = false
            }
            return this
        },

        listen: function listen (el) {
            if (typeof el === 'string') {
                var els = document.querySelectorAll(el),
                    i = els.length
                while (i--) {
                    listen(els[i])
                }
                return
            }
            el.addEventListener('click', function () {
                api.open(el)
            })
            return this
        }

    }

    overlay.addEventListener('click', api.close)
    return api

})()