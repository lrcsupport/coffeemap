import Foundation

// Matches Instagram's data export JSON structure for "following" data.
// Instagram exports following data in files named following.json or following_1.json, etc.
//
// Format 1 (wrapped):
// {
//   "relationships_following": [
//     {
//       "title": "",
//       "media_list_data": [],
//       "string_list_data": [
//         { "href": "https://www.instagram.com/username", "value": "username", "timestamp": 1609459200 }
//       ]
//     }
//   ]
// }
//
// Format 2 (flat array):
// [
//   {
//     "title": "",
//     "media_list_data": [],
//     "string_list_data": [
//       { "href": "https://www.instagram.com/username", "value": "username", "timestamp": 1609459200 }
//     ]
//   }
// ]

struct InstagramExportWrapped: Codable {
    let relationships_following: [InstagramFollowingEntry]
}

struct InstagramFollowingEntry: Codable {
    let title: String?
    let media_list_data: [AnyDecodable]?
    let string_list_data: [InstagramStringData]

    enum CodingKeys: String, CodingKey {
        case title
        case media_list_data
        case string_list_data
    }
}

struct InstagramStringData: Codable {
    let href: String
    let value: String
    let timestamp: Int
}

// Helper for ignoring unknown JSON structures in media_list_data
struct AnyDecodable: Codable {
    init(from decoder: Decoder) throws {
        _ = try decoder.singleValueContainer()
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encodeNil()
    }
}
