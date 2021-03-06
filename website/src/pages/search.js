/** @jsx jsx */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'gatsby';
import debounce from 'lodash.debounce';
import { jsx, Global } from '@emotion/core';
import { Input } from '@arch-ui/input';
import { Location } from '@reach/router';
import { colors } from '@arch-ui/theme';

import { Header } from '../components';
import { getResults } from '../utils/search';

const Search = ({ location, navigate }) => {
  let [input, setInput] = useState();
  let [defaultInputInjected, setDefaultInputInjected] = useState(false);
  useEffect(() => {
    if (!defaultInputInjected) {
      setDefaultInputInjected(true);
      setInput(new URL(location.href).searchParams.get('q'));
    }
  }, setInput);

  let [query, setQuery] = useState(input);
  let [results, setResults] = useState({ results: [] });

  const setQueryDebounced = useCallback(
    debounce(value => {
      setQuery(value);
      navigate(location.pathname + '?q=' + encodeURIComponent(value), {
        replace: true,
      });
    }, 200),
    [setQuery]
  );

  useEffect(() => {
    let cancelled = false;

    getResults(query).then(queryResults => {
      if (cancelled) {
        return;
      }
      setResults(queryResults);
    });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <React.Fragment>
      <Global
        styles={{
          body: {
            margin: 0,
            color: colors.B.D55,
            background: colors.B.bg,
            fontFamily: 'system-ui, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto,sans-serif',
          },

          'pre[class*="language-"]': {
            background: 'white',
            fontSize: '0.8em',
            width: '100%',
            maxWidth: 600,
          },
        }}
      />
      <Header />
      <div
        css={{
          height: 'calc(100vh - 66px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            css={{
              maxWidth: 900,
              margin: '0 auto',
              padding: 16,
            }}
          >
            <h1>Search Results for '{query}'</h1>

            <Input
              type="text"
              value={input}
              onChange={event => {
                setInput(event.target.value);
                setQueryDebounced(event.target.value);
              }}
              placeholder="Search"
            />
            <ul css={{ padding: 0 }}>
              {results.results.map(result => (
                <li
                  css={{
                    padding: 10,
                    borderBottom: `1px solid ${colors.B.A25}`,
                    listStyle: 'none',
                  }}
                  key={result.slug}
                >
                  <div>
                    <Link
                      style={{
                        fontSize: '1.25em',
                        color: colors.B.base,
                        textTransform: 'capitalize',
                      }}
                      to={result.slug}
                    >
                      {result.title}
                    </Link>
                    <small style={{ color: 'grey' }}>({result.navGroup})</small>
                  </div>
                  <p css={{ marginBottom: 0 }}>{result.preview}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

const SearchPage = () => (
  <Location>
    {props => {
      return <Search {...props} />;
    }}
  </Location>
);

export default SearchPage;
