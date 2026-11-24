import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../layouts/Header";
import {
  createThread,
  createThreadComment,
  deleteThread,
  getThreadComments,
  getThreadLocations,
  getThreads,
  getTopics,
  getUploadUrl,
  reportThread,
  updateThreadLike,
} from "../../action/action";
import { CommentsModal } from "../../components/modals/CommentsModal/CommentsModal";
import { ReportPostModal } from "../../components/modals/ReportPostModal/ReportPostModal";
import { useProfile } from "../../context/ProfileContext";
import "./Knkt.css";

const threadLabels = {
  1: "Popular Threads",
  2: "Latest Threads",
  3: "My Threads",
};
const emptyThreadForm = {
  question: "",
  location: "",
  topic: [],
  title: "",
  body: "",
};

function relativeTime(timestamp) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Number(timestamp)) / 60000),
  );
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function isVideoThread(thread) {
  const mediaType = String(thread.mediaType || "")
    .toLowerCase()
    .replace(/[-_\s]/g, "");
  const media = String(thread.media || "").toLowerCase();
  return (
    ["video", "videolink", "flicks", "link"].includes(mediaType) ||
    /\.(mp4|webm|ogg)(\?|$)/.test(media)
  );
}

async function uploadFile(file, extension, contentType) {
  const signedUrl = await getUploadUrl(extension);
  const upload = await fetch(signedUrl.data, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!upload.ok) throw new Error("Unable to upload media.");
  return signedUrl.data.split("?")[0];
}

function createVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        blob
          ? resolve(blob)
          : reject(new Error("Unable to create video thumbnail."));
      }, "image/jpeg");
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to create video thumbnail."));
    };
    video.src = objectUrl;
  });
}

function PostTypeIcon({ postType }) {
  const icons = {
    1: ["/assets/logo_icons/Professional.svg", "Professional"],
    2: ["/assets/logo_icons/personal.svg", "Personal"],
    3: [
      "/assets/logo_icons/User and Briefcase Icon.png",
      "Personal and Professional",
    ],
  };
  const icon = icons[postType];
  if (!icon) return null;
  return (
    <span
      className={`knkt-post-type ${postType === 3 ? "knkt-post-type-both" : ""}`}
      aria-label={icon[1]}
    >
      <img src={icon[0]} alt={icon[1]} />
    </span>
  );
}

export function Knkt() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [threadFilter, setThreadFilter] = useState(1);
  const [threadFilterOpen, setThreadFilterOpen] = useState(false);
  const [threadData, setThreadData] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadPage, setThreadPage] = useState(0);
  const [isLoadingMoreThreads, setIsLoadingMoreThreads] = useState(false);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [threadForm, setThreadForm] = useState(emptyThreadForm);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [openThreadMenu, setOpenThreadMenu] = useState(null);
  const [reportThreadId, setReportThreadId] = useState(null);
  const [deleteThreadId, setDeleteThreadId] = useState(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [shareThread, setShareThread] = useState(null);
  const [commentThread, setCommentThread] = useState(null);
  const [likingThreadIds, setLikingThreadIds] = useState(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [threadSubmitting, setThreadSubmitting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const threadLikeStateRef = useRef(new Map());
  const threadLikeVersionRef = useRef(new Map());
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const threadsEndRef = useRef(null);
  const navigate = useNavigate();
  const { profile } = useProfile();

  useEffect(() => {
    if (!selectedMedia) {
      setMediaPreviewUrl("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedMedia);
    setMediaPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedMedia]);

  useEffect(() => {
    const closeOpenPanels = (event) => {
      if (
        event.target.closest(
          ".knkt-filter-wrap, .knkt-thread-composer, .knkt-new-post",
        )
      )
        return;
      setThreadFilterOpen(false);
      setIsComposerOpen(false);
    };
    document.addEventListener("click", closeOpenPanels);
    return () => document.removeEventListener("click", closeOpenPanels);
  }, []);

  useEffect(() => {
    getTopics()
      .then((response) => setTopics(response.data))
      .finally(() => setTopicsLoading(false));
  }, []);

  useEffect(() => {
    const query = threadForm.location.trim();
    if (!query) {
      setLocationSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      getThreadLocations(query).then((response) =>
        setLocationSuggestions(response.data || []),
      );
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [threadForm.location]);

  useEffect(() => {
    setThreadsLoading(true);
    setThreadPage(0);
    getThreads(0, threadFilter)
      .then((response) => {
        const threads = response.data || [];
        setThreadData(threads);
        setHasMoreThreads(threads.length >= 10);
      })
      .finally(() => setThreadsLoading(false));
  }, [threadFilter]);

  useEffect(() => {
    const loadMoreThreads = async () => {
      if (threadsLoading || isLoadingMoreThreads || !hasMoreThreads) return;
      setIsLoadingMoreThreads(true);
      try {
        const nextPage = threadPage + 1;
        const response = await getThreads(nextPage, threadFilter);
        const nextThreads = response.data || [];
        setThreadData((currentThreads) => [...currentThreads, ...nextThreads]);
        setThreadPage(nextPage);
        setHasMoreThreads(nextThreads.length >= 10);
      } finally {
        setIsLoadingMoreThreads(false);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreThreads();
      },
      { rootMargin: "280px" },
    );

    if (threadsEndRef.current) observer.observe(threadsEndRef.current);
    return () => observer.disconnect();
  }, [
    hasMoreThreads,
    isLoadingMoreThreads,
    threadFilter,
    threadPage,
    threadsLoading,
  ]);

  const updateThreadForm = (field, value) =>
    setThreadForm((current) => ({ ...current, [field]: value }));

  const toggleTopic = (topicId) => {
    const selectedTopics = threadForm.topic.includes(topicId);
    if (selectedTopics) {
      updateThreadForm(
        "topic",
        threadForm.topic.filter((id) => id !== topicId),
      );
    } else if (threadForm.topic.length < 5) {
      updateThreadForm("topic", [...threadForm.topic, topicId]);
    }
  };

  const removeTopic = (topicId) =>
    updateThreadForm(
      "topic",
      threadForm.topic.filter((id) => id !== topicId),
    );

  const handleDeleteThread = async () => {
    if (!deleteThreadId || isDeletingThread) return;
    setIsDeletingThread(true);
    try {
      await deleteThread(deleteThreadId);
      setThreadData((currentThreads) =>
        currentThreads.filter(
          (thread) => (thread._id || thread.id) !== deleteThreadId,
        ),
      );
      setDeleteThreadId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingThread(false);
    }
  };

  const handleThreadLike = async (thread) => {
    const threadId = thread._id || thread.id;
    if (!threadId) return;
    const previousLiked = threadLikeStateRef.current.has(threadId)
      ? threadLikeStateRef.current.get(threadId)
      : Boolean(thread.isLiked ?? thread.liked ?? thread.likeStatus);
    const nextLiked = !previousLiked;
    const requestVersion =
      (threadLikeVersionRef.current.get(threadId) || 0) + 1;
    threadLikeStateRef.current.set(threadId, nextLiked);
    threadLikeVersionRef.current.set(threadId, requestVersion);
    setThreadData((currentThreads) =>
      currentThreads.map((item) =>
        (item._id || item.id) === threadId
          ? {
              ...item,
              isLiked: nextLiked,
              likeStatus: nextLiked,
              likeCount: Math.max(
                0,
                Number(item.likeCount || 0) + (nextLiked ? 1 : -1),
              ),
            }
          : item,
      ),
    );
    setLikingThreadIds((current) => new Set(current).add(threadId));
    try {
      await updateThreadLike(threadId, nextLiked);
    } catch (error) {
      const isLatestRequest =
        threadLikeVersionRef.current.get(threadId) === requestVersion;
      if (
        isLatestRequest &&
        threadLikeStateRef.current.get(threadId) === nextLiked
      ) {
        threadLikeStateRef.current.set(threadId, previousLiked);
        setThreadData((currentThreads) =>
          currentThreads.map((item) =>
            (item._id || item.id) === threadId
              ? {
                  ...item,
                  isLiked: previousLiked,
                  likeStatus: previousLiked,
                  likeCount: Math.max(
                    0,
                    Number(item.likeCount || 0) + (nextLiked ? -1 : 1),
                  ),
                }
              : item,
          ),
        );
      }
      console.error(error);
    } finally {
      setLikingThreadIds((current) => {
        const next = new Set(current);
        next.delete(threadId);
        return next;
      });
    }
  };

  const getThreadShareText = (thread) => {
    const authorName =
      [thread.fname, thread.lname].filter(Boolean).join(" ") ||
      thread.username ||
      "User";
    return `📢 Social Knkt Notification\nNew Thread Shared by: ${authorName}\nThread: ${thread.title || thread.body || thread.question || ""}\nStay connected and check out the latest activity on Social Knkt.`;
  };

  const handleShareThread = async () => {
    if (!shareThread) return;
    const threadId = shareThread._id || shareThread.id;
    const shareUrl = `${window.location.origin}/knkt?threadId=${threadId}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: `${shareThread.title || "Thread"}`,
          text: getThreadShareText(shareThread),
          url: shareUrl,
        });
      else await navigator.clipboard.writeText(getThreadShareText(shareThread));
    } catch {
      // Sharing can be cancelled or unavailable.
    }
  };

  const copyThreadShareLink = async () => {
    if (!shareThread) return;
    try {
      await navigator.clipboard.writeText(getThreadShareText(shareThread));
      setShareThread(null);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setSubmitAttempted(false);
    setTopicMenuOpen(false);
  };

  const openComposer = () => {
    setThreadFilterOpen(false);
    setSubmitAttempted(false);
    setTopicMenuOpen(false);
    setIsComposerOpen(true);
  };

  const handleMediaSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) setSelectedMedia(file);
    event.target.value = "";
  };

  const handleThreadSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const missingRequiredField =
      !threadForm.title.trim() ||
      !threadForm.body.trim() ||
      !threadForm.location.trim();
    if (missingRequiredField) return;
    if (!threadForm.topic.length) {
      setTopicMenuOpen(true);
      return;
    }
    setThreadSubmitting(true);
    try {
      let media = "";
      let thumbnail = "";
      let mediaType = "";
      if (selectedMedia) {
        mediaType = selectedMedia.type.startsWith("video/") ? "video" : "image";
        const extension = selectedMedia.name.includes(".")
          ? selectedMedia.name.split(".").pop().toLowerCase()
          : mediaType === "video"
            ? "mp4"
            : "jpg";
        media = await uploadFile(selectedMedia, extension);
        thumbnail =
          mediaType === "video"
            ? await uploadFile(
                await createVideoThumbnail(selectedMedia),
                "jpg",
                "image/jpeg",
              )
            : media;
      }
      await createThread({
        question:
          threadForm.question.trim() ||
          threadForm.body.trim() ||
          threadForm.title.trim(),
        location: threadForm.location.trim(),
        topic: threadForm.topic,
        title: threadForm.title.trim(),
        body: threadForm.body.trim(),
        media,
        type: 2,
        thumbnail,
        mediaType,
      });
      setThreadForm(emptyThreadForm);
      setSubmitAttempted(false);
      setTopicMenuOpen(false);
      setSelectedMedia(null);
      setIsComposerOpen(false);
      const response = await getThreads(0, threadFilter);
      const threads = response.data || [];
      setThreadPage(0);
      setThreadData(threads);
      setHasMoreThreads(threads.length >= 10);
    } catch (error) {
      console.error(error);
    } finally {
      setThreadSubmitting(false);
    }
  };

  return (
    <div className="knkt-page">
      <Header />
      <main className="knkt-content">
        <section className="knkt-banner"></section>

        <section className="knkt-topics">
          <div className="knkt-section-title">
            <h2>Popular Topics</h2>
            <button type="button" onClick={() => navigate("/knkt/topics")}>
              See All
            </button>
          </div>
          <div
            className="knkt-topic-list"
            onWheel={(event) => {
              event.preventDefault();
              event.currentTarget.scrollBy({
                left: event.deltaY,
                behavior: "smooth",
              });
            }}
          >
            {topicsLoading
              ? Array.from({ length: 12 }, (_, index) => (
                  <div className="knkt-topic knkt-topic-skeleton" key={index}>
                    <span className="topic-skeleton-circle" />
                    <span className="topic-skeleton-label" />
                  </div>
                ))
              : topics.slice(0, 12).map((topic) => (
                  <div className="knkt-topic" key={topic._id}>
                    <img src={topic.image} alt={topic.topic || topic.title} />
                    <span>{topic.topic || topic.title}</span>
                  </div>
                ))}
          </div>
        </section>

        <div className="knkt-grid">
          <section className="knkt-threads">
            <div className="knkt-section-title">
              <h2>{threadLabels[threadFilter]}</h2>
              <div className="knkt-thread-actions">
                <button
                  className="knkt-new-post"
                  type="button"
                  onClick={openComposer}
                >
                  ＋ New Post
                </button>
                <div className="knkt-filter-wrap">
                  <button
                    className="knkt-filter-button"
                    type="button"
                    aria-label="Filter threads"
                    onClick={() => {
                      closeComposer();
                      setThreadFilterOpen(!threadFilterOpen);
                    }}
                  >
                    <img
                      src="/assets/logo_icons/solar_sort-linear.svg"
                      alt=""
                    />
                  </button>
                  {threadFilterOpen && (
                    <div className="knkt-filter-menu">
                      {Object.entries(threadLabels).map(([value, label]) => (
                        <button
                          className={
                            threadFilter === Number(value) ? "active" : ""
                          }
                          key={value}
                          type="button"
                          onClick={() => {
                            setThreadFilter(Number(value));
                            setThreadFilterOpen(false);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {isComposerOpen && (
              <form
                className="knkt-thread-composer"
                noValidate
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleThreadSubmit}
              >
                <div className="knkt-composer-head">
                  <div>
                    <img
                      src={
                        profile?.image ||
                        "/assets/logo_icons/profile_avatar.png"
                      }
                      alt={profile?.fullName || "Profile"}
                    />
                    <strong>
                      {profile?.fullName || profile?.username || "Your Profile"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={closeComposer}
                  >
                    ×
                  </button>
                </div>
                <input
                  className={
                    submitAttempted && !threadForm.title.trim()
                      ? "knkt-field-invalid"
                      : ""
                  }
                  aria-label="Title"
                  placeholder="Title"
                  value={threadForm.title}
                  onChange={(event) =>
                    updateThreadForm("title", event.target.value)
                  }
                  required
                />
                <textarea
                  className={
                    submitAttempted && !threadForm.body.trim()
                      ? "knkt-field-invalid"
                      : ""
                  }
                  aria-label="Body"
                  placeholder="Body"
                  rows="4"
                  value={threadForm.body}
                  onChange={(event) =>
                    updateThreadForm("body", event.target.value)
                  }
                  required
                />
                <div className="knkt-composer-location-wrap">
                  <label
                    className={`knkt-composer-location${submitAttempted && !threadForm.location.trim() ? " knkt-field-invalid" : ""}`}
                  >
                    <img src="/assets/logo_icons/location.svg" alt="" />
                    <input
                      aria-label="Location"
                      placeholder="Location"
                      value={threadForm.location}
                      onChange={(event) =>
                        updateThreadForm("location", event.target.value)
                      }
                      required
                    />
                  </label>
                  {locationSuggestions.length > 0 && (
                    <div className="knkt-location-suggestions">
                      {locationSuggestions.map((location) => (
                        <button
                          type="button"
                          key={location._id}
                          onClick={() => {
                            updateThreadForm(
                              "location",
                              `${location.city}, ${location.country}`,
                            );
                            setLocationSuggestions([]);
                          }}
                        >
                          <strong>{location.city}</strong>
                          <small>{location.country}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={`knkt-topic-select-wrap${topicMenuOpen ? " is-open" : ""}${submitAttempted && !threadForm.topic.length ? " knkt-field-invalid" : ""}`}
                >
                  <button
                    className="knkt-topic-select"
                    type="button"
                    aria-label="Choose categories"
                    aria-required="true"
                    aria-invalid={submitAttempted && !threadForm.topic.length}
                    onClick={() => setTopicMenuOpen((open) => !open)}
                    disabled={topicsLoading}
                  >
                    <span className="knkt-topic-chips">
                      {threadForm.topic.length ? (
                        threadForm.topic.map((topicId) => {
                          const topic = topics.find(
                            (item) => item._id === topicId,
                          );
                          return (
                            <span className="knkt-topic-chip" key={topicId}>
                              {topic?.topic || topic?.title || topicId}
                              <b
                                role="button"
                                tabIndex="0"
                                aria-label={`Remove ${topic?.topic || topic?.title || "category"}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeTopic(topicId);
                                }}
                              >
                                ×
                              </b>
                            </span>
                          );
                        })
                      ) : (
                        <span className="knkt-topic-placeholder">
                          Choose up to 5 Categories
                        </span>
                      )}
                    </span>
                    <img
                      src="/assets/logo_icons/postadddropdown.svg"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                  {topicMenuOpen && (
                    <div className="knkt-topic-menu">
                      {topics.map((topic) => (
                        <button
                          className={
                            threadForm.topic.includes(topic._id)
                              ? "selected"
                              : ""
                          }
                          type="button"
                          key={topic._id}
                          onClick={() => toggleTopic(topic._id)}
                        >
                          {topic.topic || topic.title}
                          {threadForm.topic.includes(topic._id) && (
                            <span>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <small className="knkt-topic-note">
                  Choose up to 5 categories.
                </small>
                <input
                  ref={photoInputRef}
                  className="knkt-hidden-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleMediaSelect}
                />
                <input
                  ref={videoInputRef}
                  className="knkt-hidden-file-input"
                  type="file"
                  accept="video/*"
                  onChange={handleMediaSelect}
                />
                <div className="knkt-composer-media">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <img src="/assets/logo_icons/post_card_img.svg" alt="" />
                    Add a Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <img src="/assets/logo_icons/post_card_video.svg" alt="" />
                    Take a Video
                  </button>
                </div>
                {selectedMedia && mediaPreviewUrl && (
                  <div className="knkt-media-preview">
                    {selectedMedia.type.startsWith("video/") ? (
                      <video
                        src={mediaPreviewUrl}
                        controls
                        playsInline
                        preload="metadata"
                        aria-label="Selected video preview"
                      />
                    ) : (
                      <img src={mediaPreviewUrl} alt="Selected image preview" />
                    )}
                    <button
                      type="button"
                      aria-label="Remove selected media"
                      onClick={() => setSelectedMedia(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  className="knkt-create-thread"
                  type="submit"
                  disabled={threadSubmitting}
                >
                  {threadSubmitting ? "Creating..." : "Create Thread"}
                </button>
              </form>
            )}
            {threadsLoading
              ? Array.from({ length: 3 }, (_, index) => (
                  <article
                    className="knkt-thread knkt-thread-skeleton"
                    key={index}
                  />
                ))
              : threadData.map((thread) => {
                  const name =
                    [thread.fname, thread.lname].filter(Boolean).join(" ") ||
                    thread.username;
                  const threadOwnerId =
                    thread.userId ||
                    thread.user?._id ||
                    thread.user?._id?.toString();
                  const currentUserId =
                    profile?._id || profile?.id || profile?.userId;
                  const isOwnThread = Boolean(
                    threadOwnerId &&
                      currentUserId &&
                      String(threadOwnerId) === String(currentUserId),
                  );
                  const threadId = thread._id || thread.id;
                  return (
                    <article className="knkt-thread" key={thread._id}>
                      <div className="knkt-thread-head">
                        <img
                          src={
                            thread.userImage ||
                            thread.image ||
                            "/assets/logo_icons/profile_avatar.png"
                          }
                          alt={name || "User"}
                        />
                        <div>
                          <strong>{name}</strong>
                          <small>
                            {relativeTime(thread.createdAt)}{" "}
                            <PostTypeIcon
                              postType={thread.type || thread.postType}
                            />
                          </small>
                        </div>
                        <div className="post-options">
                          <button
                            className="more-button"
                            type="button"
                            aria-label="Thread options"
                            aria-expanded={openThreadMenu === threadId}
                            onClick={() =>
                              setOpenThreadMenu(
                                openThreadMenu === threadId ? null : threadId,
                              )
                            }
                          >
                            ⋮
                          </button>
                          {openThreadMenu === threadId && (
                            <div className="post-options-menu" role="menu">
                              <button
                                className="post-delete-option"
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenThreadMenu(null);
                                  if (isOwnThread) setDeleteThreadId(threadId);
                                  else setReportThreadId(threadId);
                                }}
                              >
                                <img
                                  src={
                                    isOwnThread
                                      ? "/assets/logo_icons/red_delete_icon.svg"
                                      : "/assets/logo_icons/report.svg"
                                  }
                                  alt=""
                                />
                                <span>{isOwnThread ? "Delete" : "Report"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {thread.title && (
                        <h3 className="knkt-thread-title">{thread.title}</h3>
                      )}
                      {(thread.body || thread.question) && (
                        <p>{thread.body || thread.question}</p>
                      )}
                      {thread.media &&
                        (isVideoThread(thread) ? (
                          <video
                            className="knkt-thread-media"
                            src={thread.media}
                            poster={thread.thumbnail || undefined}
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            className="knkt-thread-media"
                            src={thread.media}
                            alt={thread.title || "Thread media"}
                          />
                        ))}
                      <div className="knkt-actions">
                        <button
                          className={`knkt-like-button${Boolean(thread.isLiked ?? thread.liked ?? thread.likeStatus) ? " is-liked" : ""}`}
                          type="button"
                          onClick={() => handleThreadLike(thread)}
                          aria-pressed={Boolean(
                            thread.isLiked ?? thread.liked ?? thread.likeStatus,
                          )}
                        >
                          <img
                            src={
                              Boolean(
                                thread.isLiked ??
                                  thread.liked ??
                                  thread.likeStatus,
                              )
                                ? "/assets/logo_icons/heartLike.svg"
                                : "/assets/logo_icons/like.svg"
                            }
                            alt=""
                          />
                          {thread.likeCount || 0} Like
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommentThread(thread)}
                        >
                          <img src="/assets/logo_icons/comment.svg" alt="" />
                          {thread.commentCount || 0} Comments
                        </button>
                        <button
                          type="button"
                          onClick={() => setShareThread(thread)}
                        >
                          <img src="/assets/logo_icons/share_icon.svg" alt="" />
                          Share
                        </button>
                      </div>
                    </article>
                  );
                })}
            {reportThreadId && (
              <ReportPostModal
                postId={reportThreadId}
                contentLabel="Thread"
                reportAction={reportThread}
                onClose={() => setReportThreadId(null)}
              />
            )}
            {shareThread && (
              <div
                className="post-share-backdrop"
                role="presentation"
                onClick={() => setShareThread(null)}
              >
                <div
                  className="post-share-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="share-thread-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="post-share-close"
                    type="button"
                    aria-label="Close"
                    onClick={() => setShareThread(null)}
                  >
                    ×
                  </button>
                  <h2 id="share-thread-title">Share Thread</h2>
                  <button
                    className="post-share-action"
                    type="button"
                    onClick={handleShareThread}
                  >
                    Share
                  </button>
                  <button
                    className="post-share-action"
                    type="button"
                    onClick={copyThreadShareLink}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}
            {commentThread && (
              <CommentsModal
                post={{
                  ...commentThread,
                  description:
                    commentThread.body || commentThread.question || "",
                    thumbnail:
                      commentThread.thumbnail ||
                      commentThread.videoThumbnail ||
                      commentThread.mediaThumbnail ||
                      "",
                  commentCount: commentThread.commentCount || 0,
                }}
                getCommentsAction={getThreadComments}
                commentAction={createThreadComment}
                onClose={() => setCommentThread(null)}
                onCommentCountChange={(change) =>
                  setThreadData((current) =>
                    current.map((item) =>
                      (item._id || item.id) ===
                      (commentThread._id || commentThread.id)
                        ? {
                            ...item,
                            commentCount: Math.max(
                              0,
                              Number(item.commentCount || 0) + change,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
            )}
            {deleteThreadId && (
              <div
                className="post-delete-modal-backdrop"
                role="presentation"
                onClick={() => !isDeletingThread && setDeleteThreadId(null)}
              >
                <div
                  className="post-delete-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-thread-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="post-delete-modal-close"
                    type="button"
                    aria-label="Close"
                    onClick={() => setDeleteThreadId(null)}
                    disabled={isDeletingThread}
                  >
                    ×
                  </button>
                  <h2 id="delete-thread-title">Delete Thread</h2>
                  <p>Are you sure you want to delete this thread?</p>
                  <div className="post-delete-modal-actions">
                    <button
                      type="button"
                      onClick={() => setDeleteThreadId(null)}
                      disabled={isDeletingThread}
                    >
                      Cancel
                    </button>
                    <button
                      className="post-delete-confirm"
                      type="button"
                      onClick={handleDeleteThread}
                      disabled={isDeletingThread}
                    >
                      {isDeletingThread ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div ref={threadsEndRef} aria-hidden="true" />
            {isLoadingMoreThreads && (
              <article
                className="knkt-thread knkt-thread-skeleton"
                aria-label="Loading more threads"
              />
            )}
          </section>
          <aside className="knkt-sidebar">
            {/* <div className="knkt-side-card"><h3>Who to follow</h3>{['Steve Jobs', 'Ryan Rolansky', 'Dylan Field', 'Dianne Russell'].map((name) => <div className="knkt-follow" key={name}><img src="/assets/logo_icons/profile_avatar.png" alt="" /><div><strong>{name}</strong><small>Professional</small></div><button type="button">Connect</button></div>)}<a href="/connections">See All</a></div> */}
            <div className="knkt-side-card knkt-question">
              <h3>
                Ask a question <b>＋</b>
              </h3>
              <p>What would you like to discuss with the community?</p>
              <a href="#ask">See All</a>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}