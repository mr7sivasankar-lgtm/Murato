import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myillo_app/main.dart';

void main() {
  testWidgets('MyilloApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyilloApp());
    await tester.pump();
    // App renders without crashing
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
