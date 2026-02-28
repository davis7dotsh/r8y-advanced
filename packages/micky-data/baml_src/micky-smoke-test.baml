class SponsorInfo {
  sponsorName string
  sponsorKey string
}

class CommentParse {
  isEditingMistake bool
  isSponsorMention bool
  isQuestion bool
  isPositiveComment bool
}

function GetSponsor(sponsorPrompt: string, videoDescription: string) -> SponsorInfo {
  client OpenCodeZenClaudeHaikuClient
  prompt #"
    Parse this youtube video's description to find the video's sponsor. You are looking for the sponsor's name and a key to identify the sponsor in the db. Both the key and name should be lowercase.

    The following will tell you how to get each of those for this channel:
    {{ sponsorPrompt }}

    The video description is:
    {{ videoDescription }}

    {{ ctx.output_format }}
  "#
}

function ParseComment(
  videoTitle: string,
  videoDescription: string,
  commentAuthor: string,
  commentText: string
) -> CommentParse {
  client OpenCodeZenClaudeHaikuClient
  prompt #"
    Classify this YouTube comment for Micky channel analytics.

    Output booleans using the following rules:
    - isEditingMistake: true if the comment reports mistakes, bugs, wrong facts, timestamp/editing issues, or asks for corrections.
    - isSponsorMention: true if the comment mentions sponsorship, ad reads, affiliate links, or sponsor brands.
    - isQuestion: true if the comment asks a question requiring an answer.
    - isPositiveComment: true if the tone is positive/supportive.

    Video title:
    {{ videoTitle }}

    Video description:
    {{ videoDescription }}

    Comment author:
    {{ commentAuthor }}

    Comment text:
    {{ commentText }}

    {{ ctx.output_format }}
  "#
}

test no_sponsor {
    functions [GetSponsor]
    args {
        sponsorPrompt "The sponsor key for this channel is `https://soydev.link/${SPONSOR_NAME}`. There are often multiple soydev links in the description. The one for the sponsor will come after something similar to 'Thank you ${SPONSOR_NAME} for sponsoring!'. If it doesn't mention that the sponsor name is a sponsor, then there is no sponsor and you should set the sponsor name to 'no sponsor' and the sponsor key to 'https://t3.gg'"
        videoDescription #"
            There's a lot wrong with MCP, thankfully Anthropic seems to be finally doing something about it...

            no sponsor today, go checkout t3 chat: https://soydev.link/chat

SOURCE
https://www.anthropic.com/engineering...

Want to sponsor a video? Learn more here: https://soydev.link/sponsor-me

Check out my Twitch, Twitter, Discord more at https://t3.gg

S/O Ph4se0n3 for the awesome edit 🙏
        "#
    }
}

test sevalla_sponsor {
    functions [GetSponsor]
    args {
        sponsorPrompt "The sponsor key for this channel is `https://soydev.link/${SPONSOR_NAME}`. There are often multiple soydev links in the description. The one for the sponsor will come after something similar to 'Thank you ${SPONSOR_NAME} for sponsoring!'. If it doesn't mention that the sponsor name is a sponsor, then there is no sponsor and you should set the sponsor name to 'no sponsor' and the sponsor key to 'https://t3.gg'"
        videoDescription #"
            There's a lot wrong with MCP, thankfully Anthropic seems to be finally doing something about it...

Thank you Sevalla for sponsoring! Check them out at: https://soydev.link/sevalla

SOURCE
https://www.anthropic.com/engineering...

Want to sponsor a video? Learn more here: https://soydev.link/sponsor-me

Check out my Twitch, Twitter, Discord more at https://t3.gg

S/O Ph4se0n3 for the awesome edit 🙏
        "#
    }
}

test convex_sponsor {
    functions [GetSponsor]
    args {
        sponsorPrompt "The sponsor key for this channel is `https://soydev.link/${SPONSOR_NAME}`. There are often multiple soydev links in the description. The one for the sponsor will come after something similar to 'Thank you ${SPONSOR_NAME} for sponsoring!'. If it doesn't mention that the sponsor name is a sponsor, then there is no sponsor and you should set the sponsor name to 'no sponsor' and the sponsor key to 'https://t3.gg'"
        videoDescription #"
            My journey with Arc was...weird. If you followed me here, I'm sorry. I hope this helps.

Thank you Convex for sponsoring! Check them out at https://soydev.link/convex

PLEASE PAY ZEN BROWSER, THEY NEED TO WIN
https://zen-browser.app/donate/

Check out my Twitch, Twitter, Discord more at https://t3.gg

S/O Ph4se0n3 for the awesome edit 🙏
        "#
    }
}

test g2i_sponsor {
  functions [GetSponsor]
  args {
    sponsorPrompt "The sponsor key for this channel is `https://soydev.link/${SPONSOR_NAME}`. There are often multiple soydev links in the description. The one for the sponsor will come after something similar to 'Thank you ${SPONSOR_NAME} for sponsoring!'. If it doesn't mention that the sponsor name is a sponsor, then there is no sponsor and you should set the sponsor name to 'no sponsor' and the sponsor key to 'https://t3.gg'"
    videoDescription #"
        Claude Code just got a ton of new features, all of which are really really cool. I just wish they worked better...

Thank you G2i for sponsoring! Check them out at: https://soydev.link/g2i

Want to sponsor a video? Learn more here: https://soydev.link/sponsor-me

Check out my Twitch, Twitter, Discord more at https://t3.gg

S/O Ph4se0n3 for the awesome edit 🙏
    "#
  }
}

test comment_positive_question {
  functions [ParseComment]
  args {
    videoTitle "How to ship with Bun"
    videoDescription "A walkthrough of Bun SQL and deployment workflows."
    commentAuthor "dev1"
    commentText "Great vid, this helped a lot. Do you have a follow-up for auth patterns?"
  }
}

test comment_sponsor_mention {
  functions [ParseComment]
  args {
    videoTitle "My honest review of build tools"
    videoDescription "This video has a sponsor and goes through tradeoffs."
    commentAuthor "dev2"
    commentText "Convex sponsoring this was interesting, thanks for disclosing the ad."
  }
}

test comment_editing_mistake {
  functions [ParseComment]
  args {
    videoTitle "Database performance tuning"
    videoDescription "Benchmarks and practical production tuning tips."
    commentAuthor "dev3"
    commentText "At 08:14 the query plan shown is wrong and the index name is misspelled."
  }
}
