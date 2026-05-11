// ─── Chat Service ─────────────────────────────────────────────────────────────
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';
import '../services/auth_service.dart';

class ChatService {
  static io.Socket? _socket;

  static Map<String, String> _headers({String? token}) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  // ── REST API ──────────────────────────────────────────────────────────────

  static Future<List<dynamic>> fetchMyChats() async {
    final token = await AuthService.getToken();
    final res = await http.get(
      Uri.parse('${ApiConfig.chat}/mine'),
      headers: _headers(token: token),
    );
    if (res.statusCode != 200) return [];
    return jsonDecode(res.body) as List<dynamic>;
  }

  static Future<Map<String, dynamic>> startChat({
    required String sellerId,
    required String adId,
  }) async {
    final token = await AuthService.getToken();
    final res = await http.post(
      Uri.parse('${ApiConfig.chat}/start'),
      headers: _headers(token: token),
      body: jsonEncode({'sellerId': sellerId, 'adId': adId}),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  static Future<List<dynamic>> fetchMessages(String chatId) async {
    final token = await AuthService.getToken();
    final res = await http.get(
      Uri.parse('${ApiConfig.chat}/$chatId/messages'),
      headers: _headers(token: token),
    );
    if (res.statusCode != 200) return [];
    return jsonDecode(res.body) as List<dynamic>;
  }

  static Future<Map<String, dynamic>> sendMessage({
    required String chatId,
    required String text,
  }) async {
    final token = await AuthService.getToken();
    final res = await http.post(
      Uri.parse('${ApiConfig.chat}/$chatId/messages'),
      headers: _headers(token: token),
      body: jsonEncode({'text': text, 'type': 'text'}),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ── Socket.io ─────────────────────────────────────────────────────────────

  static Future<void> connectSocket() async {
    if (_socket != null && _socket!.connected) return;
    final token = await AuthService.getToken();
    _socket = io.io(
      ApiConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .disableAutoConnect()
          .build(),
    );
    _socket!.connect();
  }

  static void joinRoom(String chatId) {
    _socket?.emit('join_room', chatId);
  }

  static void sendSocketMessage(Map<String, dynamic> data) {
    _socket?.emit('send_message', data);
  }

  static void emitTyping(Map<String, dynamic> data) {
    _socket?.emit('typing', data);
  }

  static void onReceiveMessage(Function(dynamic) callback) {
    _socket?.on('receive_message', callback);
  }

  static void onTyping(Function(dynamic) callback) {
    _socket?.on('typing', callback);
  }

  static void offReceiveMessage() => _socket?.off('receive_message');
  static void offTyping()        => _socket?.off('typing');

  static void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
