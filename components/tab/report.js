import API from "api";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Select from "react-select";
import chroma from "chroma-js";
import moment from "moment";
import Cookie from "js-cookie";
import { socket } from "script/socket";

const getClosestData = (data, current_time) => {
  let current_data = {};
  let next_data = {};
  let event_status = false;

  let current_time_ms = moment(current_time, "HH:mm:ss").toDate();
  let current_data_ms = 0;
  let next_data_ms = 0;
  data.forEach((data) => {
    let data_end_time = moment(data.end, "HH:mm:ss").toDate();
    let data_start_time = moment(data.start, "HH:mm:ss").toDate();
    if (
      current_time_ms <= data_end_time &&
      current_time_ms >= data_start_time
    ) {
      current_data = data;
      event_status = true;
    } else if (current_time_ms <= data_start_time) {
      if (current_time_ms >= next_data_ms) {
        next_data = data;
        next_data_ms = data_start_time;
      }
    } else if (current_time_ms >= data_end_time) {
      if (current_time_ms <= current_data_ms) {
        current_data = data;
        current_data_ms = data_end_time;
      }
    }
  });

  if (!event_status && next_data.id === undefined) {
    let current_time_ms = moment("00:00", "HH:mm:ss").toDate();
    data.forEach((data) => {
      let data_end_time = moment(data.end, "HH:mm:ss").toDate();
      let data_start_time = moment(data.start, "HH:mm:ss").toDate();
      if (
        current_time_ms <= data_end_time &&
        current_time_ms >= data_start_time
      ) {
        current_data = data;
        event_status = true;
      } else if (current_time_ms <= data_start_time) {
        if (current_time_ms >= next_data_ms) {
          next_data = data;
          next_data_ms = data_start_time;
        }
      } else if (current_time_ms >= data_end_time) {
        if (current_time_ms <= current_data_ms) {
          current_data = data;
          current_data_ms = data_end_time;
        }
      }
    });
  }
  return { event_status, current_data, next_data };
};

const colourStyles = {
  control: (styles) => ({ ...styles, backgroundColor: "white" }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
        ? data.color
        : isFocused
        ? color.alpha(0.1).css()
        : undefined,
      color: isDisabled
        ? "#ccc"
        : isSelected
        ? chroma.contrast(color, "white") > 2
          ? "white"
          : "black"
        : data.color,
      cursor: isDisabled ? "not-allowed" : "default",

      ":active": {
        ...styles[":active"],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.color
            : color.alpha(0.3).css()
          : undefined,
      },
    };
  },
  multiValue: (styles, { data }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: color.alpha(0.1).css(),
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    color: data.color,
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    color: data.color,
    ":hover": {
      backgroundColor: data.color,
      color: "white",
    },
  }),
};

export default function ReportTabContent(props) {
  const { handleReport, failed, server, isEventTime, auth } = props;
  const [continent, setContinent] = useState([]);
  const [serverSelect, setServerSelect] = useState(null);
  const [continentSelect, setContinentSelect] = useState(null);
  const [territorySelect, setTerritorySelect] = useState(null);
  const [favorSelect, setFavorSelect] = useState(null);
  const [itemSelect, setItemSelect] = useState(null);

  const [continentSelectSave, setContinentSelectSave] = useState(null);

  const [territoryOption, setTerritoryOption] = useState([]);
  const [favorOption, setFavorOption] = useState([]);
  const [cardOption, setCardOption] = useState([]);

  const serverRef = useRef(null);
  const continentRef = useRef(null);
  const territoryRef = useRef(null);
  const favorRef = useRef(null);
  const itemRef = useRef(null);

  // loading
  const [territoryLoading, setTerritoryLoading] = useState(true);
  const [itemLoading, setItemLoading] = useState(true);
  const [isNewSelect, setIsNewSelect] = useState(false);

  let server_id;
  let server_name;
  switch (server) {
    case "Lufeon":
      server_id = 1;
      server_name = "?????????";
      break;
    case "Silian":
      server_id = 2;
      server_name = "?????????";
      break;
    case "Aman":
      server_id = 3;
      server_name = "??????";
      break;
    case "Karmain":
      server_id = 4;
      server_name = "?????????";
      break;
    case "Kazeros":
      server_id = 5;
      server_name = "????????????";
      break;
    case "Abrelshud":
      server_id = 6;
      server_name = "???????????????";
      break;
    case "Kardan":
      server_id = 7;
      server_name = "??????";
      break;
    case "Ninave":
      server_id = 8;
      server_name = "?????????";
      break;
  }

  useEffect(() => {
    API.get("/periodicevents").then((res) => {
      let date = new Date();
      let getClosestEvent = getClosestData(res.data, date);
      let continent_data = [];

      if (getClosestEvent.event_status) {
        getClosestEvent.current_data.continents.forEach((data) => {
          continent_data.push({
            value: data.id,
            label: data.name,
          });
        });
      }
      setContinent(continent_data);
    });
  }, []);

  function handleReportSubmit(e) {
    e.preventDefault();
    let continent = continentSelect.value;
    let territory = territorySelect.value;
    let favor = favorSelect.value;
    let card = itemSelect.value;

    let currentDate = moment().format("HH:mm:ss");
    console.log(currentDate);

    const token = Cookie.get("token"); // ????????? ??????
    API.post(
      "/reports",
      {
        server: [server_id],
        continent: [continent],
        territory: [territory],
        itemfavor: [favor],
        itemcard: [card],
        report_date: currentDate,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => {
        continentRef.current.clearValue();
        territoryRef.current.clearValue();
        favorRef.current.clearValue();
        itemRef.current.clearValue();
        console.log("emit report", res.data);
        socket.emit("report", res.data);
        handleReport();
      })
      .catch((e) => {
        failed();
      });
  }

  function handleContinent(item) {
    if (item) {
      setTerritoryLoading(true);
      API.get(`/continents/${item.value}`).then((res) => {
        let fin = [];
        res.data.territories.forEach((territory) => {
          fin.push({
            value: territory.id,
            label: territory.name,
          });
        });
        territoryRef.current.clearValue();
        favorRef.current.clearValue();
        itemRef.current.clearValue();
        setTerritoryOption(fin);
        setContinentSelect(item);
        setTerritoryLoading(false);
        setIsNewSelect(true);
      });
    }
  }

  function handleTerritory(item) {
    let favor_array = [];
    let card_array = [];
    setItemLoading(true);
    if (item) {
      API.get(`/continents/${continentSelectSave.value}`).then((res) => {
        favorRef.current.clearValue();
        itemRef.current.clearValue();
        API.get(`/dealerinfos/${res.data.dealerinfos[0].id}`).then((favor) => {
          favor.data.itemfavors.forEach((favors) => {
            let color = "#000000";
            switch (favors.class) {
              case 1:
                color = "#000000";
                break;
              case 2:
                color = "#a1b853";
                break;
              case 3:
                color = "#4285f4";
                break;
              case 4:
                color = "#9900ff";
                break;
              case 5:
                color = "#ad8927";
                break;
              default:
                color = "#000000";
            }
            favor_array.push({
              value: favors.id,
              label: favors.name,
              color: color,
            });
          });
          favor.data.itemcards.forEach((favors) => {
            let color = "#000000";
            switch (favors.class) {
              case 1:
                color = "#000000";
                break;
              case 2:
                color = "#a1b853";
                break;
              case 3:
                color = "#4285f4";
                break;
              case 4:
                color = "#9900ff";
                break;
              case 5:
                color = "#ad8927";
                break;
              default:
                color = "#000000";
            }
            card_array.push({
              value: favors.id,
              label: favors.name,
              color: color,
            });
          });
          setIsNewSelect(false);
        });
      });
      setFavorOption(favor_array);
      setCardOption(card_array);
      setTerritorySelect(item);
      setItemLoading(false);
    }
  }

  return (
    <div>
      <div className="mapLayer_content report_overflow">
        {auth ? (
          <>
            {" "}
            {isEventTime ? (
              <>
                <div className="message">{server_name} ?????? ?????? ??????</div>
                <div className="content_subtitle">??????</div>
                <Select
                  ref={continentRef}
                  defaultValue={continentSelect}
                  onChange={(item) => {
                    handleContinent(item);
                    setContinentSelectSave(item);
                  }}
                  isSearchable={false}
                  options={continent}
                  placeholder="?????? ??????"
                  noOptionsMessage={() => "?????? ?????? ??????"}
                  menuPlacement="auto"
                />

                <div className="content_subtitle">??????</div>
                <Select
                  ref={territoryRef}
                  defaultValue={territorySelect}
                  onChange={(item) => {
                    handleTerritory(item);
                  }}
                  isLoading={territoryLoading}
                  isSearchable={false}
                  options={territoryOption}
                  placeholder="?????? ??????"
                  noOptionsMessage={() => "?????? ?????? ??????"}
                  isDisabled={territoryLoading}
                  menuPlacement="auto"
                />

                <div className="content_subtitle">????????? ????????? </div>
                <Select
                  ref={favorRef}
                  defaultValue={favorSelect}
                  onChange={setFavorSelect}
                  isSearchable={false}
                  options={favorOption}
                  placeholder="????????? ????????? ??????"
                  noOptionsMessage={() => "?????? ?????? ??????"}
                  isLoading={itemLoading}
                  isDisabled={isNewSelect}
                  styles={colourStyles}
                  menuPlacement="auto"
                />

                <div className="content_subtitle">?????? </div>
                <Select
                  ref={itemRef}
                  defaultValue={itemSelect}
                  onChange={setItemSelect}
                  isSearchable={false}
                  options={cardOption}
                  placeholder="?????? ??????"
                  noOptionsMessage={() => "?????? ?????? ??????"}
                  isLoading={itemLoading}
                  isDisabled={isNewSelect}
                  styles={colourStyles}
                  menuPlacement="auto"
                />

                {continentSelect &&
                territorySelect &&
                favorSelect &&
                itemSelect ? (
                  <div
                    className="report_button"
                    onClick={(e) => {
                      handleReportSubmit(e);
                    }}
                  >
                    ?????? ??????
                  </div>
                ) : (
                  <div className="report_button disable">?????? ??????</div>
                )}
              </>
            ) : (
              <div className="no_more_text">
                <h4 className="loading_text">?????? ?????? ????????? ????????????!</h4>
              </div>
            )}
          </>
        ) : (
          <a href="/login">
            <div className="message">
              {server_name} ????????? ??????????????? ?????????????????????!
            </div>
            <div className="login_wrap" style={{ margin: "0" }}>
              <div className="login_text">Lostar ?????????</div>
              <div className="login_tip">
                ???????????? ?????? ????????? ????????? ??? ????????????!
              </div>
            </div>
          </a>
        )}
        <div className="info_text">
          ????????? ???????????????{" "}
          <a
            href="https://open.kakao.com/o/sqWmbsSd"
            target="_blank"
            style={{
              color: "#f1de08",
            }}
          >
            ????????????
          </a>{" "}
          ??? ??????????????????!
        </div>
      </div>
    </div>
  );
}
