import { useEffect, useState, useRef } from "react";
import { Box, Typography, MenuItem, Tooltip, useMediaQuery, FormControl, InputLabel, Select, IconButton, Link, Collapse, Divider } from "@mui/material";
import Loading from "../utils/Loading";
import { useLocation, useParams } from "react-router-dom";
import YoutubePlayer from "./YoutubePlayer";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NotFound from "../utils/NotFound";
import Chat from "./Chat";
import Chapters from "./VodChapters";
import ExpandMore from "../utils/CustomExpandMore";
import CustomToolTip from "../utils/CustomToolTip";
import { parse } from "tinyduration";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toHMS } from "../utils/helpers";

export default function Vod(props) {
  const location = useLocation();
  const isPortrait = useMediaQuery("(orientation: portrait)");
  const { vodId } = useParams();
  const { type, VODS_API_BASE, channel, twitchId } = props;
  const [vod, setVod] = useState(undefined);
  const [youtube, setYoutube] = useState(undefined);
  const [drive, setDrive] = useState(undefined);
  const [chapter, setChapter] = useState(undefined);
  const [part, setPart] = useState(undefined);
  const [showMenu, setShowMenu] = useState(true);
  const [currentTime, setCurrentTime] = useState(undefined);
  const [playing, setPlaying] = useState({ playing: false });
  const [delay, setDelay] = useState(undefined);
  const [userChatDelay, setUserChatDelay] = useState(0);
  const playerRef = useRef(null);

  useEffect(() => {
    const fetchVod = async () => {
      await fetch(`${VODS_API_BASE}/vods/${vodId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((response) => {
          setVod(response);
          document.title = `${response.id} - ${channel}`;
        })
        .catch((e) => {
          console.error(e);
        });
    };
    fetchVod();
    return;
  }, [vodId, VODS_API_BASE, channel]);

  useEffect(() => {
    if (!vod) return;
    if (!type) {
      const useType = vod.youtube.some((youtube) => youtube.type === "live") ? "live" : "vod";
      setYoutube(vod.youtube.filter((data) => data.type === useType));
      setDrive(vod.drive.filter((data) => data.type === useType));
    } else {
      setYoutube(vod.youtube.filter((data) => data.type === type));
      setDrive(vod.drive.filter((data) => data.type === type));
    }
    setChapter(vod.chapters ? vod.chapters[0] : null);
    return;
  }, [vod, type]);

  useEffect(() => {
    if (!youtube) return;

    const search = new URLSearchParams(location.search);
    let timestamp = search.get("t") !== null ? convertTimestamp(search.get("t")) : 0;
    let tmpPart = search.get("part") !== null ? parseInt(search.get("part")) : 1;
    if (timestamp > 0) {
      for (let data of youtube) {
        if (data.duration > timestamp) {
          tmpPart = data?.part || youtube.indexOf(data) + 1;
          break;
        }
        timestamp -= data.duration;
      }
    }
    setPart({ part: tmpPart, timestamp: timestamp });
  }, [location.search, youtube]);

  useEffect(() => {
    if (!playerRef.current || !vod || !vod.chapters) return;
    for (let chapter of vod.chapters) {
      if (currentTime > chapter.start && currentTime < chapter.start + chapter.end) {
        setChapter(chapter);
        break;
      }
    }
  }, [currentTime, vod, playerRef]);

  useEffect(() => {
    if (!youtube || !vod) return;
    const vodDuration = toSeconds(vod.duration);
    let totalYoutubeDuration = 0;
    for (let data of youtube) {
      totalYoutubeDuration += data.duration;
    }
    const tmpDelay = vodDuration - totalYoutubeDuration < 0 ? 0 : vodDuration - totalYoutubeDuration;
    setDelay(tmpDelay);
  }, [youtube, vod]);

  const handlePartChange = (evt) => {
    const tmpPart = evt.target.value + 1;
    setPart({ part: tmpPart, duration: 0 });
  };

  const handleExpandClick = () => {
    setShowMenu(!showMenu);
  };

  useEffect(() => {
    if (delay === undefined) return;
    console.info(`Chat Delay: ${userChatDelay + delay} seconds`);
  }, [userChatDelay, delay]);

  const copyTimestamp = () => {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?t=${toHMS(currentTime)}`);
  };

  if (vod === undefined || drive === undefined || chapter === undefined || part === undefined || delay === undefined) return <Loading />;

  if (youtube.length === 0) return <NotFound channel={channel} />;

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Box sx={{ display: "flex", flexDirection: isPortrait ? "column" : "row", height: "100%", width: "100%" }}>
        <Box sx={{ display: "flex", height: "100%", width: "100%", flexDirection: "column", alignItems: "flex-start", minWidth: 0, overflow: "hidden", position: "relative" }}>
          <YoutubePlayer playerRef={playerRef} part={part} youtube={youtube} setCurrentTime={setCurrentTime} setPart={setPart} setPlaying={setPlaying} delay={delay} />
          <Box sx={{ position: "absolute", bottom: 0, left: "50%", width: "100%" }}>
            <Tooltip title={showMenu ? "Collapse" : "Expand"}>
              <ExpandMore expand={showMenu} onClick={handleExpandClick} aria-expanded={showMenu} aria-label="show menu">
                <ExpandMoreIcon />
              </ExpandMore>
            </Tooltip>
          </Box>
          <Collapse in={showMenu} timeout="auto" unmountOnExit sx={{ minHeight: "auto !important", width: "100%" }}>
            <Box sx={{ display: "flex", p: 1, alignItems: "center" }}>
              {chapter && <Chapters chapters={vod.chapters} chapter={chapter} setPart={setPart} youtube={youtube} setChapter={setChapter} />}
              <CustomToolTip title={vod.title}>
                <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ml: 1 }}>
                  <Typography fontWeight={550} variant="body1">{`${vod.title}`}</Typography>
                </Box>
              </CustomToolTip>
              <Box sx={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                <Box sx={{ ml: 0.5 }}>
                  <FormControl variant="outlined">
                    <InputLabel id="select-label">Part</InputLabel>
                    <Select labelId="select-label" label="Part" value={part.part - 1} onChange={handlePartChange} autoWidth>
                      {youtube.map((data, i) => {
                        return (
                          <MenuItem key={data.id} value={i}>
                            {data?.part || i + 1}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ ml: 0.5 }}>
                  {drive && drive[0] && (
                    <Tooltip title={`Download Vod`}>
                      <IconButton component={Link} href={`https://drive.google.com/u/2/open?id=${drive[0].id}`} color="primary" aria-label="Download Vod" rel="noopener noreferrer" target="_blank">
                        <CloudDownloadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Box sx={{ ml: 0.5 }}>
                  <Tooltip title={`Copy Current Timestamp`}>
                    <IconButton onClick={copyTimestamp} color="primary" aria-label="Copy Current Timestamp" rel="noopener noreferrer" target="_blank">
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Box>
        {isPortrait && <Divider />}
        <Chat
          isPortrait={isPortrait}
          vodId={vodId}
          playerRef={playerRef}
          playing={playing}
          delay={delay}
          userChatDelay={userChatDelay}
          youtube={youtube}
          part={part}
          setPart={setPart}
          twitchId={twitchId}
          channel={channel}
          VODS_API_BASE={VODS_API_BASE}
          setUserChatDelay={setUserChatDelay}
        />
      </Box>
    </Box>
  );
}

const toSeconds = (hms) => {
  const time = hms.split(":");

  return +time[0] * 60 * 60 + +time[1] * 60 + +time[2];
};

/**
 * Parse Timestamp (1h2m3s) to seconds.
 */
const convertTimestamp = (timestamp) => {
  try {
    timestamp = parse(`PT${timestamp.toUpperCase()}`);
    timestamp = (timestamp?.hours || 0) * 60 * 60 + (timestamp?.minutes || 0) * 60 + (timestamp?.seconds || 0);
  } catch {
    timestamp = 0;
  }

  return timestamp;
};
