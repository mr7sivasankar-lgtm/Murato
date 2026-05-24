// ─── Google Places Service ────────────────────────────────────────────────────
// Uses Google Places Web API directly (no additional Flutter package needed).
// The same API key used for Maps SDK (in AndroidManifest.xml) works here.
// Requires "Places API" enabled in Google Cloud Console.

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

// ── Data Models ───────────────────────────────────────────────────────────────

class PlaceSuggestion {
  final String placeId;
  final String mainText;       // e.g. "Netham"
  final String secondaryText;  // e.g. "Andhra Pradesh, India"
  final String fullText;       // e.g. "Netham, Andhra Pradesh, India"

  const PlaceSuggestion({
    required this.placeId,
    required this.mainText,
    required this.secondaryText,
    required this.fullText,
  });
}

class PlaceDetails {
  final double lat;
  final double lng;
  final String fullAddress;    // Formatted full address string
  final String city;           // locality
  final String area;           // sublocality
  final String street;         // route / thoroughfare
  final String state;          // administrative_area_level_1
  final String pincode;        // postal_code

  const PlaceDetails({
    required this.lat,
    required this.lng,
    required this.fullAddress,
    required this.city,
    required this.area,
    required this.street,
    required this.state,
    required this.pincode,
  });

  /// Short display label: "Area, City" or "City" or fullAddress
  String get shortDisplay {
    if (area.isNotEmpty && city.isNotEmpty) return '$area, $city';
    if (city.isNotEmpty) return city;
    if (fullAddress.isNotEmpty) return fullAddress;
    return 'Unknown Location';
  }

  /// Multi-line address for the confirmation card
  String get formattedAddress {
    final parts = <String>[];
    if (street.isNotEmpty)  parts.add(street);
    if (area.isNotEmpty)    parts.add(area);
    if (city.isNotEmpty)    parts.add(city);
    if (state.isNotEmpty)   parts.add(state);
    if (pincode.isNotEmpty) parts.add(pincode);
    if (parts.isNotEmpty)   return parts.join(', ');
    return fullAddress;
  }
}

// ── Helper: parse address_components list ─────────────────────────────────────
Map<String, String> _parseComponents(List<dynamic> components) {
  String city = '', area = '', street = '', state = '', pincode = '';
  for (final c in components) {
    final comp  = c as Map<String, dynamic>;
    final types = (comp['types'] as List<dynamic>).cast<String>();
    final name  = comp['long_name'] as String? ?? '';
    if (types.contains('locality'))                       { city    = name; }
    else if (types.contains('sublocality_level_1') ||
             types.contains('sublocality'))               { area    = name; }
    else if (types.contains('administrative_area_level_1')) { state = name; }
    else if (types.contains('postal_code'))               { pincode = name; }
    else if (types.contains('route'))                     { street  = name; }
    // Fallbacks
    else if (types.contains('sublocality_level_2') && area.isEmpty)   { area = name; }
    else if (types.contains('administrative_area_level_2') && city.isEmpty) { city = name; }
  }
  return {'city': city, 'area': area, 'street': street, 'state': state, 'pincode': pincode};
}

// ── Service ───────────────────────────────────────────────────────────────────

class PlacesService {
  static const _placesBase  = 'https://maps.googleapis.com/maps/api/place';
  static const _geocodeBase = 'https://maps.googleapis.com/maps/api/geocode';

  static bool get _hasKey =>
      ApiConfig.googleMapsApiKey.isNotEmpty &&
      ApiConfig.googleMapsApiKey != 'YOUR_GOOGLE_MAPS_API_KEY';

  /// Autocomplete suggestions for a text query (restricted to India).
  static Future<List<PlaceSuggestion>> autocomplete(String query) async {
    if (query.trim().isEmpty || !_hasKey) return [];
    try {
      final uri = Uri.parse('$_placesBase/autocomplete/json').replace(
        queryParameters: {
          'input':      query.trim(),
          'key':        ApiConfig.googleMapsApiKey,
          'components': 'country:in',
          'language':   'en',
          'types':      'geocode',
        },
      );
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return [];
      final data        = jsonDecode(res.body) as Map<String, dynamic>;
      final predictions = data['predictions'] as List<dynamic>? ?? [];
      return predictions.map((p) {
        final pred = p as Map<String, dynamic>;
        final sf   = pred['structured_formatting'] as Map<String, dynamic>?;
        return PlaceSuggestion(
          placeId:       pred['place_id']          as String? ?? '',
          mainText:      sf?['main_text']      as String? ?? pred['description'] as String? ?? '',
          secondaryText: sf?['secondary_text'] as String? ?? '',
          fullText:      pred['description']   as String? ?? '',
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  /// Fetch full place details (lat/lng + address components) by placeId.
  static Future<PlaceDetails?> getPlaceDetails(String placeId) async {
    if (!_hasKey) return null;
    try {
      final uri = Uri.parse('$_placesBase/details/json').replace(
        queryParameters: {
          'place_id': placeId,
          'key':      ApiConfig.googleMapsApiKey,
          'fields':   'geometry,formatted_address,address_components',
          'language': 'en',
        },
      );
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final data   = jsonDecode(res.body) as Map<String, dynamic>;
      final result = data['result'] as Map<String, dynamic>?;
      if (result == null) return null;
      final geo  = (result['geometry'] as Map<String, dynamic>?)?['location']
                       as Map<String, dynamic>?;
      final lat  = (geo?['lat'] as num?)?.toDouble() ?? 0.0;
      final lng  = (geo?['lng'] as num?)?.toDouble() ?? 0.0;
      final full = result['formatted_address'] as String? ?? '';
      final comp = _parseComponents(result['address_components'] as List<dynamic>? ?? []);
      return PlaceDetails(
        lat: lat, lng: lng, fullAddress: full,
        city:    comp['city']    ?? '',
        area:    comp['area']    ?? '',
        street:  comp['street']  ?? '',
        state:   comp['state']   ?? '',
        pincode: comp['pincode'] ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  /// Reverse geocode: lat/lng → full address details using Google Geocoding API.
  static Future<PlaceDetails?> reverseGeocode(double lat, double lng) async {
    if (!_hasKey) return null;
    try {
      final uri = Uri.parse('$_geocodeBase/json').replace(
        queryParameters: {
          'latlng':   '$lat,$lng',
          'key':      ApiConfig.googleMapsApiKey,
          'language': 'en',
        },
      );
      final res = await http.get(uri).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final data    = jsonDecode(res.body) as Map<String, dynamic>;
      final results = data['results'] as List<dynamic>? ?? [];
      if (results.isEmpty) return null;
      final result = results[0] as Map<String, dynamic>;
      final full   = result['formatted_address'] as String? ?? '';
      final comp   = _parseComponents(result['address_components'] as List<dynamic>? ?? []);
      return PlaceDetails(
        lat: lat, lng: lng, fullAddress: full,
        city:    comp['city']    ?? '',
        area:    comp['area']    ?? '',
        street:  comp['street']  ?? '',
        state:   comp['state']   ?? '',
        pincode: comp['pincode'] ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  /// Google Static Map image URL for displaying a map preview.
  static String staticMapUrl({
    required double lat,
    required double lng,
    int zoom   = 16,
    int width  = 640,
    int height = 320,
  }) {
    if (!_hasKey) return '';
    return 'https://maps.googleapis.com/maps/api/staticmap'
        '?center=$lat,$lng'
        '&zoom=$zoom'
        '&size=${width}x$height'
        '&markers=color:red%7C$lat,$lng'
        '&key=${ApiConfig.googleMapsApiKey}'
        '&scale=2';
  }
}
