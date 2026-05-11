// ─── PIN Input Widget ─────────────────────────────────────────────────────────
// Uses a hidden TextField to capture soft-keyboard input on Android.
// The visible 4-box UI is purely decorative and reflects the hidden field.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/app_theme.dart';

class PinInputWidget extends StatefulWidget {
  final String value;
  final ValueChanged<String> onChange;
  final ValueChanged<String>? onComplete;
  final String? error;
  final bool autoFocus;

  const PinInputWidget({
    super.key,
    required this.value,
    required this.onChange,
    this.onComplete,
    this.error,
    this.autoFocus = true,
  });

  @override
  State<PinInputWidget> createState() => _PinInputWidgetState();
}

class _PinInputWidgetState extends State<PinInputWidget>
    with SingleTickerProviderStateMixin {
  // Hidden TextField controller — this is what actually receives soft keyboard input
  late final TextEditingController _ctrl;
  final FocusNode _focus = FocusNode();
  bool _focused = false;
  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.value);
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticIn),
    );
    _focus.addListener(() {
      setState(() => _focused = _focus.hasFocus);
    });
    if (widget.autoFocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _focus.requestFocus());
    }
  }

  @override
  void didUpdateWidget(PinInputWidget old) {
    super.didUpdateWidget(old);
    // Shake when error appears
    if (widget.error != null && old.error == null) {
      _shakeController.forward(from: 0);
    }
    // Keep hidden controller in sync if parent resets value (e.g. on error)
    if (widget.value != _ctrl.text) {
      _ctrl.text = widget.value;
      _ctrl.selection = TextSelection.collapsed(offset: widget.value.length);
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  void _onChanged(String raw) {
    // Keep only digits, max 4
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    final clamped = digits.length > 4 ? digits.substring(0, 4) : digits;

    if (clamped != widget.value) {
      widget.onChange(clamped);
      if (clamped.length == 4) {
        Future.delayed(const Duration(milliseconds: 80), () {
          widget.onComplete?.call(clamped);
        });
      }
    }

    // Correct the hidden field if we had to strip/clamp
    if (_ctrl.text != clamped) {
      _ctrl.text = clamped;
      _ctrl.selection = TextSelection.collapsed(offset: clamped.length);
    }
  }

  @override
  Widget build(BuildContext context) {
    final padded = '${widget.value}    '.substring(0, 4).split('');
    final activeIndex = widget.value.length < 4 ? widget.value.length : 3;

    return GestureDetector(
      // Tap anywhere on the widget to bring up the keyboard
      onTap: () => _focus.requestFocus(),
      child: AnimatedBuilder(
        animation: _shakeAnimation,
        builder: (context, child) {
          final shake = _shakeAnimation.value;
          final offset = shake < 0.2 ? -6.0
              : shake < 0.4 ? 6.0
              : shake < 0.6 ? -4.0
              : shake < 0.8 ? 4.0
              : 0.0;
          return Transform.translate(offset: Offset(offset, 0), child: child);
        },
        child: Column(
          children: [
            // ── Invisible TextField that captures all soft-keyboard input ──────
            SizedBox(
              width: 0,
              height: 0,
              child: TextField(
                controller: _ctrl,
                focusNode: _focus,
                autofocus: widget.autoFocus,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ],
                onChanged: _onChanged,
                // Make completely invisible
                style: const TextStyle(color: Colors.transparent, fontSize: 1),
                cursorColor: Colors.transparent,
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),

            // ── Visible 4-box PIN display ──────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (i) {
                final isFilled = padded[i].trim().isNotEmpty;
                final isActive = _focused && i == activeIndex;
                final hasError = widget.error != null;

                final borderColor = hasError
                    ? AppColors.danger
                    : isActive
                        ? AppColors.orange
                        : isFilled
                            ? AppColors.navy
                            : AppColors.border;

                final bgColor = hasError
                    ? const Color(0xFFFEF2F2)
                    : isActive
                        ? const Color(0xFFFFF8F0)
                        : isFilled
                            ? const Color(0xFFF0F3FC)
                            : AppColors.white;

                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  width: 64,
                  height: 68,
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor, width: 2.5),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: AppColors.orange.withValues(alpha: 0.18),
                              blurRadius: 8,
                              spreadRadius: 2,
                            )
                          ]
                        : null,
                  ),
                  child: Center(
                    child: isFilled
                        ? const Text(
                            '•',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppColors.navy,
                            ),
                          )
                        : isActive
                            ? _BlinkingCursor()
                            : null,
                  ),
                );
              }),
            ),

            if (widget.error != null) ...[
              const SizedBox(height: 12),
              Text(
                '❌ ${widget.error}',
                style: const TextStyle(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Blinking cursor line shown in active empty box
class _BlinkingCursor extends StatefulWidget {
  @override
  State<_BlinkingCursor> createState() => _BlinkingCursorState();
}

class _BlinkingCursorState extends State<_BlinkingCursor>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _ctrl,
      child: Container(
        width: 2,
        height: 28,
        decoration: BoxDecoration(
          color: AppColors.orange,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}
